
import { describe, it, expect } from "vitest";
import { DocumentManager } from "./document-manager.ts";

describe("DocumentManager", () => {
    it("should create an empty document", () => {
        const manager = new DocumentManager();

        expect(manager.getDocumentText("room-1")).toBe("");
    });

    it("should return the same document for the same ID", () => {
        const manager = new DocumentManager();

        const first = manager.getDocument("room-1");
        const second = manager.getDocument("room-1");

        expect(first).toBe(second);
    });

    it("should keep different documents separate", () => {
        const manager = new DocumentManager();

        const first = manager.getDocument("room-1");
        const second = manager.getDocument("room-2");

        first.insert("A:1", "H", null);

        expect(manager.getDocumentText("room-1")).toBe("H");
        expect(manager.getDocumentText("room-2")).toBe("");
    });
});
