import React from "react";
import { useStore, Task } from "../store.js";
import {
  X,
  CheckSquare,
  FileText,
  HelpCircle,
  TrendingUp,
  Files,
  Copy,
  Check,
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const { tickAcceptance, setActiveTab, setSelectedDoc, workspacePath } = useStore();
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const handleCopyCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleEditTaskFile = async () => {
    if (!window.electronAPI) return;
    try {
      const content = await window.electronAPI.readDocument(
        workspacePath,
        "task",
        task.filename
      );
      setSelectedDoc({
        type: "task",
        filename: task.filename,
        content,
      });
      setActiveTab("docs");
      onClose();
    } catch (err) {
      console.error("Failed to load task file for editing", err);
    }
  };

  const featureLoopCommand = `y kanban/task_update --task_id "${task.id}" --status "wip"`;
  const compoundLearningsCommand = `y kanban/compound_learnings --task_id "${task.id}"`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] bg-zinc-950/95 rounded-2xl glow-primary flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                TASK #{task.id}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                task.status === "todo" ? "bg-zinc-800 text-zinc-400" :
                task.status === "wip" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                task.status === "blocked" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                task.status === "verified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                "bg-violet-500/10 text-violet-400 border border-violet-500/20"
              }`}>
                {task.status}
              </span>
            </div>
            <h3 className="text-base font-semibold text-zinc-100 pr-4 mt-1 leading-snug">
              {task.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Goal */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={12} />
              Goal
            </h4>
            <p className="text-xs text-zinc-300 bg-white/5 border border-white/5 px-3 py-2.5 rounded-lg leading-relaxed">
              {task.goal}
            </p>
          </div>

          {/* Acceptance Criteria */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <CheckSquare size={12} />
              Acceptance Criteria
            </h4>
            <div className="flex flex-col gap-2 bg-white/5 border border-white/5 p-4 rounded-xl">
              {task.acceptance.length === 0 ? (
                <div className="text-xs text-zinc-500 italic">No acceptance criteria defined.</div>
              ) : (
                task.acceptance.map((criterion, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={criterion.checked}
                      onChange={(e) => tickAcceptance(task.id, idx, e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 focus:outline-none"
                    />
                    <span className={criterion.checked ? "line-through text-zinc-500" : ""}>
                      {criterion.text}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Files likely affected */}
          {task.filesAffected && task.filesAffected.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Files size={12} />
                Files Likely Affected
              </h4>
              <ul className="text-xs text-zinc-400 bg-white/5 border border-white/5 p-3 rounded-lg flex flex-col gap-1 font-mono">
                {task.filesAffected.map((file, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500/50" />
                    <span>{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Approach */}
          {task.approach && task.approach.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} />
                Proposed Approach
              </h4>
              <ul className="text-xs text-zinc-400 bg-white/5 border border-white/5 p-3.5 rounded-lg flex flex-col gap-2 list-disc pl-7 leading-relaxed">
                {task.approach.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Open Questions */}
          {task.openQuestions && task.openQuestions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <HelpCircle size={12} />
                Open Questions
              </h4>
              <ul className="text-xs text-zinc-400 bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-lg flex flex-col gap-2 list-disc pl-7 leading-relaxed">
                {task.openQuestions.map((q, i) => (
                  <li key={i} className="text-rose-300">{q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Agent MCP Helper Actions */}
          <div className="border-t border-white/5 pt-5 flex flex-col gap-3">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Agent Orchestration Helper
            </h4>
            
            <div className="flex flex-col gap-2">
              <div className="bg-black/40 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Start WIP Feature Loop</span>
                  <code className="text-[10px] text-emerald-400 font-mono truncate block">{featureLoopCommand}</code>
                </div>
                <button
                  onClick={() => handleCopyCommand(featureLoopCommand, "loop")}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Copy command"
                >
                  {copiedText === "loop" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>

              {task.status === "done" && (
                <div className="bg-black/40 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Compound Learnings Memory</span>
                    <code className="text-[10px] text-emerald-400 font-mono truncate block">{compoundLearningsCommand}</code>
                  </div>
                  <button
                    onClick={() => handleCopyCommand(compoundLearningsCommand, "learn")}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy command"
                  >
                    {copiedText === "learn" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-black/25 flex items-center justify-between">
          <button
            onClick={handleEditTaskFile}
            className="px-3.5 py-2 border border-white/5 hover:bg-white/5 text-zinc-300 hover:text-zinc-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <FileText size={14} />
            Edit Markdown File
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
