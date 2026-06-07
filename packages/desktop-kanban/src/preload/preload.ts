import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  getWorkspacePath: () => Promise<string>;
  scanBoard: (dir: string) => Promise<any>;
  scanPrds: (dir: string) => Promise<any[]>;
  scanAdrs: (dir: string) => Promise<any[]>;
  scanTasks: (dir: string) => Promise<any[]>;
  moveTask: (dir: string, taskId: string, status: string) => Promise<void>;
  readDocument: (dir: string, type: string, filename: string) => Promise<string>;
  saveDocument: (dir: string, type: string, filename: string, content: string) => Promise<void>;
  createTask: (dir: string, task: { title: string; goal: string; slug: string }) => Promise<string>;
  createDocument: (dir: string, type: string, details: { title: string; slug: string; description?: string }) => Promise<string>;
  openInExternal: (url: string) => Promise<void>;
}

const api: ElectronAPI = {
  selectDirectory: () => ipcRenderer.invoke("workspace:select-dir"),
  getWorkspacePath: () => ipcRenderer.invoke("workspace:get-path"),
  scanBoard: (dir) => ipcRenderer.invoke("kanban:scan-board", dir),
  scanPrds: (dir) => ipcRenderer.invoke("kanban:scan-prds", dir),
  scanAdrs: (dir) => ipcRenderer.invoke("kanban:scan-adrs", dir),
  scanTasks: (dir) => ipcRenderer.invoke("kanban:scan-tasks", dir),
  moveTask: (dir, taskId, status) => ipcRenderer.invoke("kanban:move-task", dir, taskId, status),
  readDocument: (dir, type, filename) => ipcRenderer.invoke("kanban:read-doc", dir, type, filename),
  saveDocument: (dir, type, filename, content) => ipcRenderer.invoke("kanban:save-doc", dir, type, filename, content),
  createTask: (dir, task) => ipcRenderer.invoke("kanban:create-task", dir, task),
  createDocument: (dir, type, details) => ipcRenderer.invoke("kanban:create-doc", dir, type, details),
  openInExternal: (url) => ipcRenderer.invoke("app:open-external", url),
};

contextBridge.exposeInMainWorld("electronAPI", api);
