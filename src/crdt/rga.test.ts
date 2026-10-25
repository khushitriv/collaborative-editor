import { describe, it, expect } from "vitest";
import { RGA } from "./rga.ts";

describe("RGA CRDT", () => {
    it("should start with an empty document", () => {
        const doc = new RGA();

        expect(doc.getText()).toBe("");
    });

    it("should insert a character without throwing", () => {
        const doc = new RGA();

        expect(() => {
            doc.insert("A:1", "c", null);
        }).not.toThrow();
    });


    it("should ignore identical duplicate character IDs", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);

        expect(() => {
            doc.insert("A:1", "c", null);
        }).not.toThrow();

        expect(doc.getText()).toBe("c");
    });


    it("should reject insertion after an unknown character", () => {
        const doc = new RGA();

        expect(() => {
            doc.insert("A:2", "a", "A:1");
        }).toThrow();
    });

    it("should reconstruct inserted text in order", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);
        doc.insert("A:2", "a", "A:1");
        doc.insert("A:3", "t", "A:2");

        expect(doc.getText()).toBe("cat");
    });


    it("should reconstruct text from character relationships", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);
        doc.insert("A:2", "a", "A:1");
        doc.insert("A:3", "t", "A:2");

        expect(doc.getText()).toBe("cat");
    });


    it("should order concurrent sibling insertions deterministically", () => {
        const doc = new RGA();

        doc.insert("A:1", "A", null);
        doc.insert("A:3", "Y", "A:1");
        doc.insert("A:2", "X", "A:1");

        expect(doc.getText()).toBe("AXY");
    });

    it("should delete a character from the visible text", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);
        doc.insert("A:2", "a", "A:1");
        doc.insert("A:3", "t", "A:2");

        doc.delete("A:2");

        expect(doc.getText()).toBe("ct");
    });

    it("should preserve descendants of a deleted character", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);
        doc.insert("A:2", "a", "A:1");
        doc.insert("A:3", "t", "A:2");

        doc.delete("A:2");

        expect(doc.getText()).toBe("ct");
    });


    it("should allow deleting the same character more than once", () => {
        const doc = new RGA();

        doc.insert("A:1", "c", null);

        doc.delete("A:1");
        doc.delete("A:1");

        expect(doc.getText()).toBe("");
    });

    it("should produce the same text on two replicas", () => {
        const replica1 = new RGA();
        const replica2 = new RGA();

        replica1.insert("A:1", "A", null);
        replica1.insert("A:2", "B", "A:1");
        replica1.insert("A:3", "C", "A:2");
        replica1.insert("B:1", "X", null);

        replica2.insert("A:1", "A", null);
        replica2.insert("B:1", "X", null);
        replica2.insert("A:2", "B", "A:1");
        replica2.insert("A:3", "C", "A:2");

        expect(replica1.getText()).toBe(replica2.getText());
    });

    it("should apply an insertion operation", () => {
        const doc = new RGA();

        doc.apply({
            type: "insert",
            id: "A:1",
            value: "H",
            after: null
        });

        expect(doc.getText()).toBe("H");
    });

    it("should apply a deletion operation", () => {
        const doc = new RGA();

        doc.apply({
            type: "insert",
            id: "A:1",
            value: "H",
            after: null
        });

        doc.apply({
            type: "delete",
            id: "A:1"
        });

        expect(doc.getText()).toBe("");
    });

    it("should serialize and deserialize an insertion operation", () => {
        const operation = {
            type: "insert" as const,
            id: "A:1",
            value: "H",
            after: null
        };

        const serialized = JSON.stringify(operation);
        const deserialized = JSON.parse(serialized);

        const doc = new RGA();
        doc.apply(deserialized);

        expect(doc.getText()).toBe("H");
    });


    it("should reject an invalid operation", () => {
        const doc = new RGA();

        expect(() => {
            doc.apply({
                type: "insert",
                id: "A:1",
                value: "Hello",
                after: null
            } as never);
        }).toThrow("Invalid operation.");

        expect(doc.getText()).toBe("");
    });

    it("should preserve the document structure when loading a snapshot", () => {
        const original = new RGA();

        original.insert("client-1:1", "H", null);
        original.insert("client-1:2", "i", "client-1:1");
        original.delete("client-1:1");

        const snapshot = original.getSnapshot();
        const restored = new RGA();

        restored.loadSnapshot(snapshot);

        expect(restored.getText()).toBe("i");
        expect(restored.getSnapshot()).toEqual(snapshot);
    });

    it("should converge when two clients insert at the same position", () => {
        const replicaA = new RGA();
        const replicaB = new RGA();

        const operationA = {
            type: "insert" as const,
            id: "client-A:1",
            value: "A",
            after: null
        };

        const operationB = {
            type: "insert" as const,
            id: "client-B:1",
            value: "B",
            after: null
        };

        // replica A receives A first,then B
        replicaA.apply(operationA);
        replicaA.apply(operationB);

        // replica B receives B first,then A
        replicaB.apply(operationB);
        replicaB.apply(operationA);

        expect(replicaA.getText()).toBe(replicaB.getText());
    });

    it("should converge when two clients insert after the same character", () => {
        const replicaA = new RGA();
        const replicaB = new RGA();

        const initialOperation = {
            type: "insert" as const,
            id: "client-0:1",
            value: "X",
            after: null
        };

        const operationA = {
            type: "insert" as const,
            id: "client-A:1",
            value: "A",
            after: "client-0:1"
        };

        const operationB = {
            type: "insert" as const,
            id: "client-B:1",
            value: "B",
            after: "client-0:1"
        };

        // both replicas begin with X
        replicaA.apply(initialOperation);
        replicaB.apply(initialOperation);

        // The replicas receive the concurrent insertions in opposite orders
        replicaA.apply(operationA);
        replicaA.apply(operationB);

        replicaB.apply(operationB);
        replicaB.apply(operationA);

        expect(replicaA.getText()).toBe(replicaB.getText());
        expect(replicaA.getText()).toHaveLength(3);
        expect(replicaA.getText()[0]).toBe("X");
    });

    it("should converge when two clients delete the same character", () => {
        const replicaA = new RGA();
        const replicaB = new RGA();

        const insertOperation = {
            type: "insert" as const,
            id: "client-0:1",
            value: "X",
            after: null
        };

        const deleteOperation = {
            type: "delete" as const,
            id: "client-0:1"
        };

        replicaA.apply(insertOperation);
        replicaB.apply(insertOperation);

        replicaA.apply(deleteOperation);
        replicaB.apply(deleteOperation);

        expect(replicaA.getText()).toBe("");
        expect(replicaB.getText()).toBe("");
        expect(replicaA.getText()).toBe(replicaB.getText());
    });

    it("should reject deletion of an unknown character", () => {
        const rga = new RGA();

        expect(() => {
            rga.delete("client-1:999");
        }).toThrow("Cannot delete unknown character: client-1:999");

        expect(rga.getText()).toBe("");
    });


    it("should allow deleting the same character more than once", () => {
        const rga = new RGA();

        rga.insert("client-1:1", "X", null);

        rga.delete("client-1:1");
        rga.delete("client-1:1");

        expect(rga.getText()).toBe("");
        expect(rga.getSnapshot()).toEqual([
            {
                id: "client-1:1",
                value: "X",
                after: null,
                deleted: true
            }
        ]);
    });

    it("should not duplicate a character when the same insertion is applied twice", () => {
        const rga = new RGA();

        const operation = {
            type: "insert" as const,
            id: "client-1:1",
            value: "X",
            after: null
        };

        rga.apply(operation);
        rga.apply(operation);

        expect(rga.getText()).toBe("X");
        expect(rga.getSnapshot()).toHaveLength(1);
    });

    it("should reject a conflicting insertion with an existing character ID", () => {
        const rga = new RGA();

        rga.apply({
            type: "insert",
            id: "client-1:1",
            value: "X",
            after: null
        });

        expect(() => {
            rga.apply({
                type: "insert",
                id: "client-1:1",
                value: "Y",
                after: null
            });
        }).toThrow();

        expect(rga.getText()).toBe("X");
        expect(rga.getSnapshot()).toEqual([
            {
                id: "client-1:1",
                value: "X",
                after: null,
                deleted: false
            }
        ]);
    });

    it("should handle an insertion arriving before its parent", () => {
        const rga = new RGA();

        const childOperation = {
            type: "insert" as const,
            id: "client-1:2",
            value: "B",
            after: "client-1:1"
        };

        const parentOperation = {
            type: "insert" as const,
            id: "client-1:1",
            value: "A",
            after: null
        };

        expect(() => {
            rga.apply(childOperation);
        }).not.toThrow();

        rga.apply(parentOperation);

        expect(rga.getText()).toBe("AB");
    });

    it("should resolve a chain of out-of-order insertions", () => {
        const rga = new RGA();

        // C depends on B,which depends on A
        rga.apply({
            type: "insert",
            id: "client-1:3",
            value: "C",
            after: "client-1:2"
        });

        rga.apply({
            type: "insert",
            id: "client-1:2",
            value: "B",
            after: "client-1:1"
        });

        // A arrives last
        rga.apply({
            type: "insert",
            id: "client-1:1",
            value: "A",
            after: null
        });

        expect(rga.getText()).toBe("ABC");
        expect(rga.getSnapshot()).toHaveLength(3);
    });

    it("should insert a character in the middle of existing text", () => {
        const doc = new RGA();

        doc.insert("A:1", "h", null);
        doc.insert("A:2", "e", "A:1");
        doc.insert("A:3", "l", "A:2");
        doc.insert("A:4", "l", "A:3");
        doc.insert("A:5", "o", "A:4");

        // to insert x between h and e.
        doc.apply({
            type: "insert",
            id: "B:1",
            value: "x",
            after: "A:1",
            timestamp: 1
        });

        expect(doc.getText()).toBe("hxello");
    });

    it("should insert multiple characters in the middle in order", () => {
        const doc = new RGA();

        doc.insert("A:1", "h", null);
        doc.insert("A:2", "e", "A:1");
        doc.insert("A:3", "l", "A:2");
        doc.insert("A:4", "l", "A:3");
        doc.insert("A:5", "o", "A:4");

        doc.apply({
            type: "insert",
            id: "B:1",
            value: "X",
            after: "A:1",
            timestamp: 1
        });

        doc.apply({
            type: "insert",
            id: "B:2",
            value: "Y",
            after: "B:1",
            timestamp: 2
        });

        expect(doc.getText()).toBe("hXYello");
    });

    it("should preserve the remaining text after deleting a middle insertion", () => {
        const doc = new RGA();

        doc.insert("A:1", "h", null);
        doc.insert("A:2", "e", "A:1");
        doc.insert("A:3", "l", "A:2");
        doc.insert("A:4", "l", "A:3");
        doc.insert("A:5", "o", "A:4");

        doc.apply({
            type: "insert",
            id: "B:1",
            value: "x",
            after: "A:1"
        });

        doc.apply({
            type: "delete",
            id: "B:1"
        });

        expect(doc.getText()).toBe("hello");
    });

    it("should preserve existing text when inserting after a deleted character", () => {
        const doc = new RGA();

        doc.insert("A:1", "h", null);
        doc.insert("A:2", "e", "A:1");
        doc.insert("A:3", "l", "A:2");
        doc.insert("A:4", "l", "A:3");
        doc.insert("A:5", "o", "A:4");

        doc.apply({
            type: "delete",
            id: "A:2"
        });

        doc.apply({
            type: "insert",
            id: "B:1",
            value: "x",
            after: "A:2",
            timestamp: 1
        });

        expect(doc.getText()).toBe("hxllo");
    });

});