import { create } from "zustand";

export type TaskStatus = "todo" | "wip" | "verified" | "done" | "achieved" | "blocked";

export interface AcceptanceCriterion {
  checked: boolean;
  text: string;
}

export interface Task {
  id: string;
  title: string;
  filename: string;
  status: TaskStatus;
  goal: string;
  acceptance: AcceptanceCriterion[];
  filesAffected?: string[];
  approach?: string[];
  openQuestions?: string[];
  notes?: string;
}

export interface Prd {
  id: string;
  title: string;
  filename: string;
  status: string;
  owner?: string;
  problem: string;
  users?: string;
  userStories?: string[];
  acceptance: AcceptanceCriterion[];
  outOfScope?: string[];
  openQuestions?: string[];
}

export interface Adr {
  id: string;
  title: string;
  filename: string;
  status: string;
  date: string;
  deciders?: string;
  context: string;
  decision: string;
  positive?: string[];
  negative?: string[];
}

export interface BoardColumn {
  status: TaskStatus;
  label: string;
  tasks: Task[];
}

export interface Board {
  columns: BoardColumn[];
  totalTasks: number;
  projectPath: string;
}

export interface SelectedDoc {
  type: "prd" | "adr" | "task";
  filename: string;
  content: string;
}

interface AppState {
  workspacePath: string;
  board: Board | null;
  prds: Prd[];
  adrs: Adr[];
  tasks: Task[];
  activeTab: "board" | "docs" | "logs" | "settings";
  selectedTask: Task | null;
  selectedDoc: SelectedDoc | null;
  isLoading: boolean;
  logs: string[];

  // Actions
  initWorkspace: () => Promise<void>;
  selectWorkspace: () => Promise<void>;
  setWorkspacePath: (path: string) => Promise<void>;
  refreshData: () => Promise<void>;
  setActiveTab: (tab: "board" | "docs" | "logs" | "settings") => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedDoc: (doc: SelectedDoc | null) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  tickAcceptance: (taskId: string, index: number, checked: boolean) => Promise<void>;
  saveDocument: (type: "prd" | "adr" | "task", filename: string, content: string) => Promise<void>;
  createNewTask: (title: string, goal: string, slug: string) => Promise<void>;
  createNewDoc: (type: "prd" | "adr", title: string, slug: string, description: string) => Promise<void>;
  addLog: (msg: string) => void;
  clearLogs: () => void;
}

// Global API shortcut from preload
const electronAPI = (window as any).electronAPI;

export const useStore = create<AppState>((set, get) => ({
  workspacePath: "",
  board: null,
  prds: [],
  adrs: [],
  tasks: [],
  activeTab: "board",
  selectedTask: null,
  selectedDoc: null,
  isLoading: false,
  logs: [],

  initWorkspace: async () => {
    if (!electronAPI) return;
    try {
      set({ isLoading: true });
      const initialPath = await electronAPI.getWorkspacePath();
      get().addLog(`Loaded initial workspace: ${initialPath}`);
      await get().setWorkspacePath(initialPath);
    } catch (err: any) {
      get().addLog(`Error loading workspace: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  selectWorkspace: async () => {
    if (!electronAPI) return;
    try {
      const selected = await electronAPI.selectDirectory();
      if (selected) {
        get().addLog(`Selected workspace folder: ${selected}`);
        await get().setWorkspacePath(selected);
      }
    } catch (err: any) {
      get().addLog(`Error picking folder: ${err.message}`);
    }
  },

  setWorkspacePath: async (path: string) => {
    set({ workspacePath: path });
    await get().refreshData();
  },

  refreshData: async () => {
    const { workspacePath } = get();
    if (!workspacePath || !electronAPI) return;
    try {
      set({ isLoading: true });
      const [board, prds, adrs, tasks] = await Promise.all([
        electronAPI.scanBoard(workspacePath),
        electronAPI.scanPrds(workspacePath),
        electronAPI.scanAdrs(workspacePath),
        electronAPI.scanTasks(workspacePath),
      ]);

      // Filter board columns to show Todo, WIP, Done, Blocked as primary columns, but keep others if we want.
      // We will show all parsed columns or a curated Trello subset. Let's show: Todo, WIP, Verified, Done, Blocked.
      set({ board, prds, adrs, tasks });
      get().addLog(`Refreshed Kanban board: ${tasks.length} tasks, ${prds.length} PRDs, ${adrs.length} ADRs.`);

      // Refresh currently selected task if it exists
      const { selectedTask } = get();
      if (selectedTask) {
        const updated = tasks.find((t) => t.id === selectedTask.id);
        if (updated) {
          set({ selectedTask: updated });
        }
      }
    } catch (err: any) {
      get().addLog(`Error scanning files: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedTask: (task) => set({ selectedTask: task }),

  setSelectedDoc: (doc) => set({ selectedDoc: doc }),

  moveTask: async (taskId, newStatus) => {
    const { workspacePath, board } = get();
    if (!workspacePath || !board || !electronAPI) return;

    // Optimistic UI update
    const columns = board.columns.map((col) => {
      // Remove task from its old column
      const filteredTasks = col.tasks.filter((t) => t.id !== taskId);
      
      // Add task to its new column if it matches
      if (col.status === newStatus) {
        const movingTask = board.columns
          .flatMap((c) => c.tasks)
          .find((t) => t.id === taskId);
        
        if (movingTask) {
          const updatedTask = { ...movingTask, status: newStatus };
          return { ...col, tasks: [...filteredTasks, updatedTask] };
        }
      }
      return { ...col, tasks: filteredTasks };
    });

    set({ board: { ...board, columns } });
    get().addLog(`Optimistically moved Task #${taskId} to ${newStatus.toUpperCase()}`);

    try {
      await electronAPI.moveTask(workspacePath, taskId, newStatus);
      get().addLog(`Persisted status change for Task #${taskId}`);
      await get().refreshData();
    } catch (err: any) {
      get().addLog(`Error persisting move: ${err.message}`);
      await get().refreshData(); // revert
    }
  },

  tickAcceptance: async (taskId, index, checked) => {
    const { workspacePath, tasks } = get();
    if (!workspacePath || !electronAPI) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      // Read current doc content
      const content = await electronAPI.readDocument(workspacePath, "task", task.filename);
      const lines = content.split("\n");
      let checkboxCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^-\s+\[[ xX]\]/)) {
          if (checkboxCount === index) {
            lines[i] = checked
              ? lines[i].replace(/\[[ ]\]/, "[x]")
              : lines[i].replace(/\[[xX]\]/, "[ ]");
            break;
          }
          checkboxCount++;
        }
      }
      const updatedContent = lines.join("\n");
      await electronAPI.saveDocument(workspacePath, "task", task.filename, updatedContent);
      get().addLog(`Updated acceptance criteria #${index} for Task #${taskId}`);
      await get().refreshData();
    } catch (err: any) {
      get().addLog(`Failed to tick criterion: ${err.message}`);
    }
  },

  saveDocument: async (type, filename, content) => {
    const { workspacePath } = get();
    if (!workspacePath || !electronAPI) return;
    try {
      await electronAPI.saveDocument(workspacePath, type, filename, content);
      get().addLog(`Successfully saved document ${filename}`);
      
      // Update selected doc content
      const { selectedDoc } = get();
      if (selectedDoc && selectedDoc.filename === filename) {
        set({ selectedDoc: { ...selectedDoc, content } });
      }

      await get().refreshData();
    } catch (err: any) {
      get().addLog(`Failed to save: ${err.message}`);
    }
  },

  createNewTask: async (title, goal, slug) => {
    const { workspacePath } = get();
    if (!workspacePath || !electronAPI) return;
    try {
      const filename = await electronAPI.createTask(workspacePath, { title, goal, slug });
      get().addLog(`Created new task: ${filename}`);
      await get().refreshData();
    } catch (err: any) {
      get().addLog(`Failed to create task: ${err.message}`);
    }
  },

  createNewDoc: async (type, title, slug, description) => {
    const { workspacePath } = get();
    if (!workspacePath || !electronAPI) return;
    try {
      const filename = await electronAPI.createDocument(workspacePath, type, { title, slug, description });
      get().addLog(`Created new ${type.toUpperCase()}: ${filename}`);
      await get().refreshData();
    } catch (err: any) {
      get().addLog(`Failed to create ${type}: ${err.message}`);
    }
  },

  addLog: (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({ logs: [`[${timestamp}] ${msg}`, ...state.logs.slice(0, 199)] }));
  },

  clearLogs: () => set({ logs: [] }),
}));
