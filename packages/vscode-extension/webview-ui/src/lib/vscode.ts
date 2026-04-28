/**
 * Typed bridge to the VS Code extension host. The webview is given
 * `acquireVsCodeApi()` exactly once; we cache it and expose typed
 * post/state helpers on top.
 */

export interface VsCodeApi<TState = unknown> {
  postMessage: (msg: unknown) => void;
  getState: () => TState | undefined;
  setState: (state: TState) => void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: <T>() => VsCodeApi<T>;
  }
}

let cached: unknown = null;

export function getVsCode<T = unknown>(): VsCodeApi<T> {
  if (cached) return cached as VsCodeApi<T>;
  if (typeof window === "undefined" || !window.acquireVsCodeApi) {
    // Browser preview / unit tests — fall back to a noop bridge.
    cached = {
      postMessage: (msg: unknown) => console.debug("[vscode noop]", msg),
      getState: () => undefined,
      setState: () => undefined,
    } satisfies VsCodeApi<T>;
    return cached as VsCodeApi<T>;
  }
  cached = window.acquireVsCodeApi<T>();
  return cached as VsCodeApi<T>;
}

/** Subscribe to messages from the extension host. Returns an unsubscribe fn. */
export function onMessage<T = unknown>(handler: (msg: T) => void): () => void {
  const listener = (event: MessageEvent) => handler(event.data as T);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
