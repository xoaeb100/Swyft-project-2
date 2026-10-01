import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  shell,
  dialog,
} from "electron";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";

import dotenv from "dotenv";

dotenv.config();

let IDENTITY_API_KEY = process.env.IDENTITY_API_KEY!;
let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
// const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

let mainWindow: BrowserWindow | null = null;

const authFile = () => path.join(app.getPath("userData"), "auth.json");
let currentIdToken: string | null = null;

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier() {
  return base64Url(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string) {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

function generateState() {
  return base64Url(crypto.randomBytes(32));
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine local port"));
        return;
      }

      const port = address.port;

      server.close(() => resolve(port));
    });

    server.on("error", reject);
  });
}

async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
) {
  const response = await fetch(
    "https://swyft-backend-230428326737.asia-south1.run.app/auth/google/exchange",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
    id_token: string;
    refresh_token?: string;
    token_type: string;
  }>;
}

async function exchangeWithIdentityPlatform(
  googleIdToken: string,
  redirectUri: string,
) {
  const postBody = new URLSearchParams({
    id_token: googleIdToken,
    providerId: "google.com",
  }).toString();

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${IDENTITY_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postBody,
        requestUri: redirectUri,
        returnSecureToken: true,
        returnIdpCredential: false,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Identity Platform sign-in failed: ${await response.text()}`,
    );
  }

  return response.json() as Promise<{
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>;
}

async function saveRefreshToken(refreshToken: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS secure storage is unavailable on this device");
  }

  const encrypted = safeStorage.encryptString(refreshToken).toString("base64");

  await fs.mkdir(path.dirname(authFile()), {
    recursive: true,
  });

  await fs.writeFile(
    authFile(),
    JSON.stringify({
      refreshToken: encrypted,
    }),
    "utf8",
  );
}

async function startGoogleSignIn() {
  const port = await getFreePort();

  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", redirectUri);

        if (requestUrl.pathname !== "/callback") {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        const returnedState = requestUrl.searchParams.get("state");

        if (returnedState !== state) {
          response.writeHead(400);
          response.end("Invalid authentication state");

          server.close();

          reject(new Error("OAuth state validation failed"));

          return;
        }

        const error = requestUrl.searchParams.get("error");

        if (error) {
          response.writeHead(200, {
            "Content-Type": "text/html",
          });

          response.end(`
              <html>
                <body>
                  <h2>Sign-in cancelled</h2>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);

          server.close();

          reject(new Error(`Google sign-in failed: ${error}`));

          return;
        }

        const code = requestUrl.searchParams.get("code");

        if (!code) {
          throw new Error("Google did not return an authorization code");
        }

        const googleTokens = await exchangeGoogleCode(
          code,
          redirectUri,
          codeVerifier,
        );

        const identityTokens = await exchangeWithIdentityPlatform(
          googleTokens.id_token,
          redirectUri,
        );

        await saveRefreshToken(identityTokens.refreshToken);
        currentIdToken = identityTokens.idToken;

        response.writeHead(200, {
          "Content-Type": "text/html",
        });

        response.end(`
            <html>
              <body>
                <h2>Signed in successfully</h2>
                <p>You can close this browser window and return to Swyft.</p>
              </body>
            </html>
          `);

        server.close();

        resolve({
          localId: identityTokens.localId,
          email: identityTokens.email,
          displayName: identityTokens.displayName,
          photoUrl: identityTokens.photoUrl,
          idToken: identityTokens.idToken,
        });
      } catch (error) {
        response.writeHead(500, {
          "Content-Type": "text/html",
        });

        response.end(`
            <html>
              <body>
                <h2>Sign-in failed</h2>
                <p>You can close this browser window.</p>
              </body>
            </html>
          `);

        server.close();

        reject(error);
      }
    });

    server.listen(port, "127.0.0.1", async () => {
      await shell.openExternal(authUrl);
    });

    server.on("error", reject);
  });
}

function createWindow(
  initialSession?: {
    localId: string;
    idToken: string;
  } | null,
) {
  //
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function loadSavedSession() {
  try {
    const raw = await fs.readFile(authFile(), "utf8");

    const stored = JSON.parse(raw) as {
      refreshToken: string;
    };

    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }

    const refreshToken = safeStorage.decryptString(
      Buffer.from(stored.refreshToken, "base64"),
    );

    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${IDENTITY_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Saved session could not be restored:",
        await response.text(),
      );

      return null;
    }

    const tokens = (await response.json()) as {
      id_token: string;
      refresh_token: string;
      user_id: string;
      expires_in: string;
    };

    // Identity Platform may rotate the refresh token.
    if (tokens.refresh_token) {
      await saveRefreshToken(tokens.refresh_token);
    }

    currentIdToken = tokens.id_token;

    return {
      localId: tokens.user_id,
      idToken: tokens.id_token,
    };
  } catch (error) {
    console.error("No saved session:", error);
    return null;
  }
}
app.whenReady().then(async () => {
  if (app.isPackaged) {
    const configPath = path.join(__dirname, "public-config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));

    IDENTITY_API_KEY = config.IDENTITY_API_KEY;
    GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
  }

  if (!IDENTITY_API_KEY || !GOOGLE_CLIENT_ID) {
    throw new Error("Missing required authentication environment variables");
  }
  ipcMain.handle("statement:pick-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Bank Statements",
          extensions: ["json", "html", "htm"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const files = await Promise.all(
      result.filePaths.map(async (filePath) => {
        const content = await fs.readFile(filePath, "utf-8");

        return {
          filePath,
          content,
        };
      }),
    );

    return files;
  });
  ipcMain.handle("auth:sign-in", async () => {
    return startGoogleSignIn();
  });

  ipcMain.handle("auth:get-session", async () => {
    return loadSavedSession();
  });

  ipcMain.handle("auth:sign-out", async () => {
    currentIdToken = null;

    try {
      await fs.unlink(authFile());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  });

  ipcMain.handle("auth:get-id-token", async () => {
    if (currentIdToken) {
      return currentIdToken;
    }

    const session = await loadSavedSession();

    if (session?.idToken) {
      currentIdToken = session.idToken;
      return currentIdToken;
    }

    return null;
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
//
