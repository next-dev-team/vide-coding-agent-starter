import { normalize } from "node:path";

/** Compare workspace folder paths on disk (case-insensitive on Windows). */
export function sameWorkspacePath(a: string, b: string): boolean {
  return normalize(a).toLowerCase() === normalize(b).toLowerCase();
}

/** True when every stored path matches an open workspace folder. */
export function storedPathsMatchFolders(stored: string[], folderPaths: string[]): boolean {
  return (
    stored.length > 0 &&
    stored.every(p => folderPaths.some(f => sameWorkspacePath(f, p)))
  );
}
