import React, { useEffect, useState } from "react";
import { useStore } from "./store.js";
import TrelloBoard from "./components/TrelloBoard.js";
import DocCenter from "./components/DocCenter.js";
import {
  LayoutDashboard,
  FileText,
  Terminal,
  Settings,
  FolderOpen,
  RefreshCw,
  Info,
} from "lucide-react";

export default function App() {
  const {
    workspacePath,
    activeTab,
    setActiveTab,
    initWorkspace,
    selectWorkspace,
    refreshData,
    isLoading,
    logs,
    clearLogs,
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    initWorkspace();
  }, [initWorkspace]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden text-zinc-100 select-none">
      {/* Lateral Sidebar */}
      <div className="w-64 border-r border-white/5 bg-zinc-950/60 backdrop-blur-xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 flex flex-col gap-1 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-violet-600 flex items-center justify-center glow-primary">
                <span className="text-xs font-bold text-white">AK</span>
              </div>
              <span className="font-semibold text-sm tracking-wide text-zinc-200">
                Agent Kanban
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Desktop Companion
            </span>
          </div>

          {/* Nav Items */}
          <div className="p-4 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab("board")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === "board"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20 glow-primary"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Kanban Board</span>
            </button>

            <button
              onClick={() => setActiveTab("docs")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === "docs"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20 glow-primary"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === "logs"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20 glow-primary"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Terminal size={16} />
              <span>Developer Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === "settings"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/20 glow-primary"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Settings size={16} />
              <span>Workspace Settings</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">
              Current Directory
            </span>
            <button
              onClick={selectWorkspace}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
            >
              <FolderOpen size={10} />
              <span>Change</span>
            </button>
          </div>
          <div
            title={workspacePath}
            className="text-xs text-zinc-400 truncate bg-white/5 px-2.5 py-1.5 rounded border border-white/5 select-all font-mono"
          >
            {workspacePath ? workspacePath.split("/").pop() : "None Loaded"}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-radial from-zinc-900 to-zinc-950">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-200 capitalize tracking-wide">
              {activeTab === "board"
                ? "Board Columns"
                : activeTab === "docs"
                ? "Product Specs & Decisions"
                : activeTab === "logs"
                ? "Local Console"
                : "Application Settings"}
            </h1>
            {isLoading && (
              <span className="text-[10px] text-zinc-500 animate-pulse bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Scanning...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !workspacePath}
              className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/5 transition-all duration-200 ${
                isRefreshing ? "animate-spin text-violet-400" : ""
              } disabled:opacity-30`}
              title="Rescan Workspace"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Primary View Router */}
        <div className="flex-1 overflow-hidden relative">
          {!workspacePath ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 backdrop-blur-sm">
              <FolderOpen className="text-zinc-600 mb-4 animate-bounce" size={48} />
              <h2 className="text-base font-medium text-zinc-200 mb-2">
                No Workspace Loaded
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
                Please select your workspace directory (containing your docs/ tasks/ folders) to open the Kanban board and documents.
              </p>
              <button
                onClick={selectWorkspace}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold glow-primary transition-all duration-200 flex items-center gap-2"
              >
                <FolderOpen size={14} />
                Open Workspace
              </button>
            </div>
          ) : (
            <>
              {activeTab === "board" && <TrelloBoard />}
              {activeTab === "docs" && <DocCenter />}
              
              {activeTab === "logs" && (
                <div className="h-full flex flex-col p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal size={14} />
                      IPC Console Activity
                    </h3>
                    <button
                      onClick={clearLogs}
                      className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                    >
                      Clear Console
                    </button>
                  </div>
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-emerald-400/90 leading-relaxed shadow-inner">
                    {logs.length === 0 ? (
                      <div className="text-zinc-600 italic">No console activity logged. Try moving tasks or Rescanning.</div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className="hover:bg-white/5 py-0.5 border-b border-white/0">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="p-8 max-w-2xl flex flex-col gap-6 overflow-y-auto h-full">
                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <Settings size={18} className="text-violet-400" />
                      Workspace Integration
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      The desktop client directly monitors your markdown workspace in real-time. Moving cards will rename files instantly, enabling direct integration with AI MCP Agents.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={selectWorkspace}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-zinc-200 rounded-lg text-xs font-medium transition-all"
                      >
                        Change Workspace Folder
                      </button>
                      <button
                        onClick={handleRefresh}
                        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium glow-primary transition-all"
                      >
                        Trigger Full Scan
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <Info size={18} className="text-violet-400" />
                      About Agent Kanban
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Version: <span className="font-mono text-zinc-300">0.1.0 (Desktop)</span><br />
                      Built with Electron + React 19 + Zustand + Vite + Tailwind CSS v4. Designed for AI-collaborative codebases.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
