import { useState, useEffect, useCallback } from "react";

/** A single todo item. */
export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = "todos";

/** Load todos from localStorage. */
function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save todos to localStorage. */
function saveTodos(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/** Hook for managing todos with localStorage persistence. */
export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);

  // Persist on every change
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const addTodo = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setTodos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: trimmed,
        done: false,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { todos, addTodo, toggleTodo, removeTodo };
}
