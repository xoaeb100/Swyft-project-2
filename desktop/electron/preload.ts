import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => "pong",

  checkBackend: async () => {
    const response = await fetch("http://localhost:3000/health");

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return response.json();
  },
  pickStatementFile: () => ipcRenderer.invoke("statement:pick-file"),

  signIn: () => {
    return ipcRenderer.invoke("auth:sign-in");
  },

  getSession: () => {
    return ipcRenderer.invoke("auth:get-session");
  },
  signOut: () => {
    return ipcRenderer.invoke("auth:sign-out");
  },
  getIdToken: () => ipcRenderer.invoke("auth:get-id-token"),
});
