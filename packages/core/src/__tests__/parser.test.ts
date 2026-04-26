import { describe, it, expect } from "vitest";
import { parseTaskFilename } from "../parser.js";

describe("parser", () => {
  describe("parseTaskFilename", () => {
    it("should parse a valid todo task filename", () => {
      const result = parseTaskFilename("todo-0001-add-input.md");
      expect(result).toEqual({
        status: "todo",
        id: "0001",
        slug: "add-input",
      });
    });

    it("should parse a valid wip task filename", () => {
      const result = parseTaskFilename("wip-0002-filter-todos.md");
      expect(result).toEqual({
        status: "wip",
        id: "0002",
        slug: "filter-todos",
      });
    });

    it("should parse a valid done task filename", () => {
      const result = parseTaskFilename("done-0003-persist.md");
      expect(result).toEqual({
        status: "done",
        id: "0003",
        slug: "persist",
      });
    });

    it("should parse a valid blocked task filename", () => {
      const result = parseTaskFilename("blocked-0004-api-integration.md");
      expect(result).toEqual({
        status: "blocked",
        id: "0004",
        slug: "api-integration",
      });
    });

    it("should return null for an invalid prefix", () => {
      const result = parseTaskFilename("invalid-0001-add-input.md");
      expect(result).toBeNull();
    });

    it("should return null for an invalid format", () => {
      const result = parseTaskFilename("random-file.txt");
      expect(result).toBeNull();
    });
  });
});
