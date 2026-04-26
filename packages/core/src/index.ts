// @agent-kanban/core
// Shared logic for parsing, writing, and scanning markdown-based Kanban workflows.

export type {
  TaskStatus,
  AcceptanceCriterion,
  Task,
  PrdStatus,
  Prd,
  AdrStatus,
  Adr,
  BoardColumn,
  Board,
  TemplateInfo,
  DocType,
} from "./types.js";

export { TASK_STATUSES } from "./types.js";

export {
  parseTaskFilename,
  parseTask,
  parseTaskFile,
  parsePrd,
  parsePrdFile,
  parseAdr,
  parseAdrFile,
} from "./parser.js";

export {
  padId,
  writeTask,
  taskFilename,
  writePrd,
  prdFilename,
  writeAdr,
  adrFilename,
} from "./writer.js";

export type {
  TaskWriteOptions,
  PrdWriteOptions,
  AdrWriteOptions,
} from "./writer.js";

export {
  scanTasks,
  scanBoard,
  scanPrds,
  scanAdrs,
  nextId,
  moveTask,
} from "./scanner.js";
