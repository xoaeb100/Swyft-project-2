import { rename, copyFile } from "node:fs/promises";

await rename("dist-electron/main.js", "dist-electron/main.cjs");
await rename("dist-electron/preload.js", "dist-electron/preload.cjs");

await copyFile(
  "electron/public-config.json",
  "dist-electron/public-config.json",
);
