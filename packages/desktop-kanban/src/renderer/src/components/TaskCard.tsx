import React from "react";
import { useStore, Task } from "../store.js";
import { CheckSquare, Paperclip } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTask } = useStore();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  // Calculate acceptance progress
  const totalCriteria = task.acceptance.length;
  const checkedCriteria = task.acceptance.filter((c) => c.checked).length;
  const percentage = totalCriteria > 0 ? Math.round((checkedCriteria / totalCriteria) * 100) : 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => setSelectedTask(task)}
      className="glass-card cursor-pointer p-4 rounded-xl flex flex-col gap-2.5 active:scale-[0.98] select-none"
    >
      {/* Task Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
          #{task.id}
        </span>
        <h4 className="text-xs font-semibold text-zinc-200 flex-1 line-clamp-2 leading-relaxed">
          {task.title}
        </h4>
      </div>

      {/* Goal */}
      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
        {task.goal}
      </p>

      {/* Progress Bar & Indicators */}
      {totalCriteria > 0 && (
        <div className="mt-1 flex flex-col gap-1.5 border-t border-white/5 pt-2">
          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare size={10} />
              <span>{checkedCriteria}/{totalCriteria} Criteria</span>
            </span>
            <span>{percentage}%</span>
          </div>
          
          {/* Progress bar line */}
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              style={{ width: `${percentage}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                percentage === 100 ? "bg-emerald-500" : "bg-violet-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Footer Info */}
      {task.filesAffected && task.filesAffected.length > 0 && (
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-0.5">
          <Paperclip size={10} />
          <span>{task.filesAffected.length} target files</span>
        </div>
      )}
    </div>
  );
}
