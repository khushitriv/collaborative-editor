
import { describe, it, expect } from "vitest";
import { validateOperation } from "./validate-operation.ts";

describe("validateOperation", () => {
    it("should accept a valid insertion", () => {
        expect(
            validateOperation({
                type: "insert",
                id: "A:1",
                value: "H",
                after: null
            })
        ).toBe(true);
    });

    it("should accept a valid deletion", () => {
        expect(
            validateOperation({
                type: "delete",
                id: "A:1"
            })
        ).toBe(true);
    });

    it("should reject an empty ID", () => {
        expect(
            validateOperation({
                type: "delete",
                id: ""
            })
        ).toBe(false);
    });

    it("should reject a multi-character insertion", () => {
        expect(
            validateOperation({
                type: "insert",
                id: "A:1",
                value: "Hello",
                after: null
            })
        ).toBe(false);
    });

    it("should reject invalid input", () => {
        expect(validateOperation(null)).toBe(false);
        expect(validateOperation([])).toBe(false);
        expect(validateOperation("hello")).toBe(false);
    });

    it("should reject an unknown operation type", () => {
        expect(
            validateOperation({
                type: "update",
                id: "A:1"
            })
        ).toBe(false);
    });
});
