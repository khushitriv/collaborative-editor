
import { describe, it, expect } from "vitest";
import type { Operation } from "./operation.ts";

describe("Operation serialization", () => {
    it("should preserve an insertion operation through JSON", () => {
        const operation: Operation = {
            type: "insert",
            id: "A:1",
            value: "H",
            after: null
        };

        const restored: Operation = JSON.parse(
            JSON.stringify(operation)
        );

        expect(restored).toEqual(operation);
    });

    it("should preserve a deletion operation through JSON", () => {
        const operation: Operation = {
            type: "delete",
            id: "A:1"
        };

        const restored: Operation = JSON.parse(
            JSON.stringify(operation)
        );

        expect(restored).toEqual(operation);
    });
});
