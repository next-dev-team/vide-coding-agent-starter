import React, { useState } from "react";
import { useStore, Prd, Adr, Task } from "../store.js";
import {
  FileText,
  HelpCircle,
  Plus,
  Save,
  X,
  Search,
  BookOpen,
  Edit,
  Sparkles,
} from "lucide-react";

export default function DocCenter() {
  const {
    prds,
    adrs,
    tasks,
    selectedDoc,
    setSelectedDoc,
    saveDocument,
    createNewDoc,
    workspacePath,
  } = useStore();

  const [activeFilter, setActiveFilter] = useState<"prd" | "adr" | "task">("prd");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  
  // Document Scaffolding Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDocType, setCreateDocType] = useState<"prd" | "adr">("prd");
  const [docTitle, setDocTitle] = useState("");
  const [docSlug, setDocSlug] = useState("");
  const [docDesc, setDocDesc] = useState("");

  const handleCreateDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docSlug) return;
    await createNewDoc(createDocType, docTitle, docSlug, docDesc);
    setShowCreateModal(false);
  };

  const handleDocTitleChange = (val: string) => {
    setDocTitle(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    setDocSlug(slug);
  };

  const handleSelectDoc = async (type: "prd" | "adr" | "task", filename: string) => {
    if (!window.electronAPI) return;
    try {
      const content = await window.electronAPI.readDocument(workspacePath, type, filename);
      setSelectedDoc({ type, filename, content });
      setIsEditing(true);
    } catch (err) {
      console.error("Failed to read doc", err);
    }
  };

  // Filter items based on search
  const filteredPrds = prds.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery)
  );
  const filteredAdrs = adrs.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.includes(searchQuery)
  );
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.includes(searchQuery)
  );

  return (
    <div className="h-full w-full flex overflow-hidden">
      
      {/* Left List Pane */}
      <div className="w-80 border-r border-white/5 flex flex-col h-full bg-zinc-950/20 shrink-0">
        {/* Actions Bar */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex gap-1 bg-black/20 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveFilter("prd")}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                activeFilter === "prd"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/15"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              PRDs
            </button>
            <button
              onClick={() => setActiveFilter("adr")}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                activeFilter === "adr"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/15"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ADRs
            </button>
            <button
              onClick={() => setActiveFilter("task")}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                activeFilter === "task"
                  ? "bg-violet-600/15 text-violet-400 border border-violet-500/15"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Tasks
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {activeFilter === "prd" ? "Requirements" : activeFilter === "adr" ? "Decisions" : "Tasks"}
            </span>
            {activeFilter !== "task" && (
              <button
                onClick={() => {
                  setCreateDocType(activeFilter);
                  setDocTitle("");
                  setDocSlug("");
                  setDocDesc("");
                  setShowCreateModal(true);
                }}
                className="text-[9px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-0.5"
              >
                <Plus size={10} />
                New
              </button>
            )}
          </div>

          {activeFilter === "prd" && filteredPrds.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectDoc("prd", p.filename)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedDoc?.filename === p.filename
                  ? "bg-violet-600/15 border-violet-500/25 text-violet-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  PRD-{p.id}
                </span>
                <span className="text-[8px] font-bold bg-zinc-800 text-zinc-400 px-1 rounded uppercase">
                  {p.status}
                </span>
              </div>
              <div className="text-xs font-semibold truncate">{p.title}</div>
            </button>
          ))}

          {activeFilter === "adr" && filteredAdrs.map((a) => (
            <button
              key={a.id}
              onClick={() => handleSelectDoc("adr", a.filename)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedDoc?.filename === a.filename
                  ? "bg-violet-600/15 border-violet-500/25 text-violet-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  ADR-{a.id}
                </span>
                <span className="text-[8px] font-bold bg-zinc-800 text-zinc-400 px-1 rounded uppercase">
                  {a.status}
                </span>
              </div>
              <div className="text-xs font-semibold truncate">{a.title}</div>
            </button>
          ))}

          {activeFilter === "task" && filteredTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectDoc("task", t.filename)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedDoc?.filename === t.filename
                  ? "bg-violet-600/15 border-violet-500/25 text-violet-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  #{t.id}
                </span>
                <span className="text-[8px] font-bold bg-zinc-800 text-zinc-400 px-1 rounded uppercase">
                  {t.status}
                </span>
              </div>
              <div className="text-xs font-semibold truncate">{t.title}</div>
            </button>
          ))}

          {((activeFilter === "prd" && filteredPrds.length === 0) ||
            (activeFilter === "adr" && filteredAdrs.length === 0) ||
            (activeFilter === "task" && filteredTasks.length === 0)) && (
            <div className="text-center py-8 text-xs text-zinc-500 italic">No files found.</div>
          )}
        </div>
      </div>

      {/* Right Editor/Viewer Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/45">
        {selectedDoc ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Document Toolbar */}
            <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-zinc-950/20 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-violet-400" />
                <span className="text-xs font-mono text-zinc-400">{selectedDoc.filename}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      isEditing
                        ? "bg-white/5 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Edit size={10} />
                      <span>Edit Markdown</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      !isEditing
                        ? "bg-white/5 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <BookOpen size={10} />
                      <span>Preview</span>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => saveDocument(selectedDoc.type, selectedDoc.filename, selectedDoc.content)}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-[10px] font-bold glow-primary flex items-center gap-1 transition-all"
                >
                  <Save size={10} />
                  Save File
                </button>

                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex overflow-hidden">
              {isEditing ? (
                /* Raw Editor */
                <textarea
                  value={selectedDoc.content}
                  onChange={(e) =>
                    setSelectedDoc({
                      ...selectedDoc,
                      content: e.target.value,
                    })
                  }
                  className="flex-1 h-full bg-black/45 p-6 font-mono text-xs text-zinc-300 focus:outline-none resize-none leading-relaxed"
                  placeholder="Write raw markdown here..."
                />
              ) : (
                /* Custom Markdown Previewer */
                <div className="flex-1 h-full overflow-y-auto p-8 select-text">
                  <div className="max-w-2xl mx-auto prose prose-invert prose-xs text-zinc-300 leading-relaxed">
                    <MarkdownPreview text={selectedDoc.content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <BookOpen size={48} className="text-zinc-700 mb-4 animate-pulse" />
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">Documents Center</h3>
            <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
              Select a PRD, ADR, or task file on the left side to review or edit its requirements in markdown.
            </p>
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md bg-zinc-950/95 rounded-2xl glow-primary p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-zinc-200">
                Scaffold New {createDocType.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDocSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. User Profile Page"
                  value={docTitle}
                  onChange={(e) => handleDocTitleChange(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Filename slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user-profile-page"
                  value={docSlug}
                  onChange={(e) => setDocSlug(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-400 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Problem Context / Background
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe why we are creating this document."
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold glow-primary transition-all flex items-center justify-center gap-2"
              >
                Create Document
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple custom Markdown previewer
function MarkdownPreview({ text }: { text: string }) {
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeContent: string[] = [];

  const rendered = lines.map((line, i) => {
    // Code block detection
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const code = codeContent.join("\n");
        codeContent = [];
        return (
          <pre key={i} className="bg-black/55 border border-white/5 p-3 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto my-3 leading-relaxed">
            {code}
          </pre>
        );
      } else {
        inCodeBlock = true;
        return null;
      }
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return null;
    }

    // Header 1
    if (line.startsWith("# ")) {
      return <h1 key={i} className="text-lg font-bold border-b border-white/5 pb-2 mt-5 mb-3 text-zinc-100">{line.substring(2)}</h1>;
    }
    // Header 2
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-sm font-semibold mt-4 mb-2 text-zinc-200">{line.substring(3)}</h2>;
    }
    // Header 3
    if (line.startsWith("### ")) {
      return <h3 key={i} className="text-xs font-semibold mt-3 mb-1.5 text-zinc-300">{line.substring(4)}</h3>;
    }
    // Blockquote
    if (line.startsWith("> ")) {
      return (
        <blockquote key={i} className="border-l-2 border-violet-500 pl-3 italic text-[11px] text-zinc-400 my-2.5 bg-white/5 py-1 pr-2 rounded-r">
          {line.substring(2)}
        </blockquote>
      );
    }
    // Checkbox Lists
    const checkMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)/);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === "x";
      const content = checkMatch[2];
      return (
        <div key={i} className="flex items-start gap-2 text-xs my-1 select-none">
          <input type="checkbox" checked={checked} disabled className="mt-0.5 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-offset-0 focus:outline-none" />
          <span className={checked ? "line-through text-zinc-500" : "text-zinc-300"}>{content}</span>
        </div>
      );
    }
    // Bullet Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="text-xs my-1 text-zinc-300 list-disc ml-4">
          {line.substring(2)}
        </li>
      );
    }

    // Standard paragraph or empty line
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }

    return (
      <p key={i} className="text-xs my-1.5 leading-relaxed text-zinc-300">
        {line}
      </p>
    );
  });

  return <div className="flex flex-col gap-0.5">{rendered}</div>;
}
