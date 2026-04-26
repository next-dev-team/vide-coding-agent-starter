import { useState, useRef, useEffect } from "react";
import { useTodos } from "./hooks/useTodos";

export function App() {
  const { todos, addTodo, toggleTodo, removeTodo } = useTodos();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    addTodo(title);
    setInput("");
    inputRef.current?.focus();
  };

  const active = todos.filter((t) => !t.done).length;
  const completed = todos.filter((t) => t.done).length;

  return (
    <>
      <h1>Todo</h1>
      <p className="subtitle">Local-first. Built with AI agents.</p>

      <form className="input-group" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit" className="btn-add">
          Add
        </button>
      </form>

      {todos.length > 0 && (
        <div className="stats">
          <span>📋 {active} active</span>
          <span>✅ {completed} done</span>
        </div>
      )}

      <div className="todo-list">
        {todos.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">📝</div>
            <p>No todos yet. Add one above!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`todo-item ${todo.done ? "done" : ""}`}
            >
              <button
                className={`todo-checkbox ${todo.done ? "checked" : ""}`}
                onClick={() => toggleTodo(todo.id)}
                aria-label={todo.done ? "Mark incomplete" : "Mark complete"}
              />
              <span className="todo-title">{todo.title}</span>
              <button
                className="btn-delete"
                onClick={() => removeTodo(todo.id)}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
