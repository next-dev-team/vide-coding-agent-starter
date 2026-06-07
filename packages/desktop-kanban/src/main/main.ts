import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  scanBoard,
  scanPrds,
  scanAdrs,
  scanTasks,
  moveTask,
  nextId,
  writeTask,
  taskFilename,
  writePrd,
  prdFilename,
  writeAdr,
  adrFilename,
  resolveTaskDir,
} from "@agent-kanban/core";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: "hiddenInset", // premium macOS style
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load front-end app
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
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

function setupIpcHandlers() {
  // Directory picker dialog
  ipcMain.handle("workspace:select-dir", async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Agent Kanban Workspace Directory",
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    return filePaths[0];
  });

  // Default initial path
  ipcMain.handle("workspace:get-path", async () => {
    // Return the CWD (usually root of project)
    return process.cwd();
  });

  // Core board scanning
  ipcMain.handle("kanban:scan-board", async (_, dir: string) => {
    return await scanBoard(dir);
  });

  ipcMain.handle("kanban:scan-prds", async (_, dir: string) => {
    return await scanPrds(dir);
  });

  ipcMain.handle("kanban:scan-adrs", async (_, dir: string) => {
    return await scanAdrs(dir);
  });

  ipcMain.handle("kanban:scan-tasks", async (_, dir: string) => {
    return await scanTasks(dir);
  });

  // Task Status moving
  ipcMain.handle("kanban:move-task", async (_, dir: string, taskId: string, status: any) => {
    await moveTask(dir, taskId, status);
  });

  // Read PRD/ADR/Task document contents
  ipcMain.handle("kanban:read-doc", async (_, dir: string, type: string, filename: string) => {
    let filePath = "";
    if (type === "prd") {
      filePath = path.join(dir, "docs", "prd", filename);
    } else if (type === "adr") {
      filePath = path.join(dir, "docs", "decisions", filename);
    } else if (type === "task") {
      // Check active or done folder
      const activePath = path.join(dir, "docs", "tasks", filename);
      const donePath = path.join(dir, "docs", "tasks", "done", filename);
      filePath = existsSync(donePath) ? donePath : activePath;
    } else {
      throw new Error(`Unknown document type: ${type}`);
    }
    
    return await fs.readFile(filePath, "utf-8");
  });

  // Save/write PRD/ADR/Task document contents
  ipcMain.handle("kanban:save-doc", async (_, dir: string, type: string, filename: string, content: string) => {
    let filePath = "";
    if (type === "prd") {
      filePath = path.join(dir, "docs", "prd", filename);
    } else if (type === "adr") {
      filePath = path.join(dir, "docs", "decisions", filename);
    } else if (type === "task") {
      const isDone = filename.startsWith("done-");
      filePath = path.join(dir, "docs", "tasks", isDone ? "done" : "", filename);
    } else {
      throw new Error(`Unknown document type: ${type}`);
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  });

  // Create a new task file
  ipcMain.handle("kanban:create-task", async (_, dir: string, task: { title: string; goal: string; slug: string }) => {
    const id = await nextId(dir, "task");
    const content = writeTask({
      id,
      title: task.title,
      goal: task.goal,
    });
    const filename = taskFilename(id, task.slug, "todo");
    const tasksDir = path.join(dir, "docs", "tasks");
    await fs.mkdir(tasksDir, { recursive: true });
    await fs.writeFile(path.join(tasksDir, filename), content, "utf-8");
    return filename;
  });

  // Create a new document (PRD or ADR)
  ipcMain.handle("kanban:create-doc", async (_, dir: string, type: string, details: { title: string; slug: string; description?: string }) => {
    if (type === "prd") {
      const id = await nextId(dir, "prd");
      const content = writePrd({
        id,
        title: details.title,
        problem: details.description || "Describe the problem statement here.",
      });
      const filename = prdFilename(id, details.slug);
      const prdDir = path.join(dir, "docs", "prd");
      await fs.mkdir(prdDir, { recursive: true });
      await fs.writeFile(path.join(prdDir, filename), content, "utf-8");
      return filename;
    } else if (type === "adr") {
      const id = await nextId(dir, "adr");
      const content = writeAdr({
        id,
        title: details.title,
        context: details.description || "State the context here.",
        decision: "State the decision here.",
      });
      const filename = adrFilename(id, details.slug);
      const adrDir = path.join(dir, "docs", "decisions");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(path.join(adrDir, filename), content, "utf-8");
      return filename;
    } else {
      throw new Error(`Unsupported document type for creation: ${type}`);
    }
  });

  // Open URL externally
  ipcMain.handle("app:open-external", async (_, url: string) => {
    await shell.openExternal(url);
  });
}
