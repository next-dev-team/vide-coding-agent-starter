import React, { useState } from "react";
import { useStore, TaskStatus, Task } from "../store.js";
import TaskCard from "./TaskCard.js";
import TaskDetailModal from "./TaskDetailModal.js";
import { Plus, X, AlertCircle } from "lucide-react";

export default function TrelloBoard() {
  const { board, moveTask, createNewTask, selectedTask, setSelectedTask } = useStore();
  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createColumnStatus, setCreateColumnStatus] = useState<TaskStatus>("todo");
  
  // Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskGoal, setTaskGoal] = useState("");
  const [taskSlug, setTaskSlug] = useState("");

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-zinc-500">
        Scanning board data...
      </div>
    );
  }

  // Display columns order
  const displayedStatuses: TaskStatus[] = ["todo", "wip", "blocked", "verified", "done"];

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setActiveDragColumn(status);
  };

  const handleDragLeave = () => {
    setActiveDragColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveDragColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      await moveTask(taskId, targetStatus);
    }
  };

  const openCreateModal = (status: TaskStatus) => {
    setCreateColumnStatus(status);
    setTaskTitle("");
    setTaskGoal("");
    setTaskSlug("");
    setShowCreateModal(true);
  };

  const handleTitleChange = (val: string) => {
    setTaskTitle(val);
    // Auto-generate slug
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    setTaskSlug(generatedSlug);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskGoal || !taskSlug) return;
    await createNewTask(taskTitle, taskGoal, taskSlug);
    setShowCreateModal(false);
  };

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-hidden">
      {/* Scrollable Column Container */}
      <div className="flex-1 flex gap-5 overflow-x-auto overflow-y-hidden pb-4 items-start select-none">
        {displayedStatuses.map((status) => {
          const col = board.columns.find((c) => c.status === status) || {
            status,
            label: status.toUpperCase(),
            tasks: [],
          };
          const isDragOver = activeDragColumn === status;

          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              className={`w-72 max-h-full flex flex-col rounded-xl glass-panel bg-zinc-950/40 p-4 transition-all duration-200 shrink-0 ${
                isDragOver ? "drag-over shadow-lg scale-[1.01]" : ""
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    status === "todo" ? "bg-zinc-400" :
                    status === "wip" ? "bg-amber-400" :
                    status === "blocked" ? "bg-rose-500" :
                    status === "verified" ? "bg-emerald-400" : "bg-violet-500"
                  }`} />
                  <h3 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                    {col.label}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                    {col.tasks.length}
                  </span>
                </div>
                
                <button
                  onClick={() => openCreateModal(status)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                  title="Add Task"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Task Cards List */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-0.5 pb-2">
                {col.tasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[10px] text-zinc-600 border border-dashed border-white/5 rounded-lg">
                    <AlertCircle size={14} className="mb-1 opacity-50" />
                    <span>No active tasks</span>
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md bg-zinc-950/95 rounded-2xl glow-primary p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-zinc-200">
                Scaffold New Task ({createColumnStatus.toUpperCase()})
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user login form"
                  value={taskTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Slug / Filename Base
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user-login-form"
                  value={taskSlug}
                  onChange={(e) => setTaskSlug(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-400 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Single-Sentence Goal
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="What is the exact end-goal of this task?"
                  value={taskGoal}
                  onChange={(e) => setTaskGoal(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold glow-primary transition-all flex items-center justify-center gap-2"
              >
                Create Task File
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
