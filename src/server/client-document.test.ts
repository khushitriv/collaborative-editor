
import { describe, it, expect } from "vitest";
import { ClientDocument } from "./client-document.ts";

describe("ClientDocument", () => {
    it("should start with empty text", () => {
        const client = new ClientDocument();

        expect(client.getText()).toBe("");
    });

    it("should apply an insertion to its local document", () => {
        const client = new ClientDocument();

        client.apply({
            type: "insert",
            id: "client-1:1",
            value: "H",
            after: null
        });

        expect(client.getText()).toBe("H");
    });

    it("should apply multiple insertions in order", () => {
        const client = new ClientDocument();

        client.apply({
            type: "insert",
            id: "client-1:1",
            value: "H",
            after: null
        });

        client.apply({
            type: "insert",
            id: "client-1:2",
            value: "i",
            after: "client-1:1"
        });

        expect(client.getText()).toBe("Hi");
    });

    it("should apply a deletion to its local document", () => {
        const client = new ClientDocument();

        client.apply({
            type: "insert",
            id: "client-1:1",
            value: "H",
            after: null
        });

        client.apply({
            type: "delete",
            id: "client-1:1"
        });

        expect(client.getText()).toBe("");
    });

    it("should produce the same text on two replicas receiving the same operations", () => {
        const client1 = new ClientDocument();
        const client2 = new ClientDocument();

        const operations = [
            {
                type: "insert" as const,
                id: "client-1:1",
                value: "H",
                after: null
            },
            {
                type: "insert" as const,
                id: "client-1:2",
                value: "i",
                after: "client-1:1"
            }
        ];

        for (const operation of operations) {
            client1.apply(operation);
            client2.apply(operation);
        }

        expect(client1.getText()).toBe("Hi");
        expect(client2.getText()).toBe("Hi");
        expect(client1.getText()).toBe(client2.getText());
    });

    it("should restore an existing document snapshot", () => {
        const original = new ClientDocument();

        original.apply({
            type: "insert",
            id: "client-1:1",
            value: "H",
            after: null
        });

        original.apply({
            type: "insert",
            id: "client-1:2",
            value: "i",
            after: "client-1:1"
        });

        const snapshot = original.getSnapshot();
        const restored = new ClientDocument();

        restored.loadSnapshot(snapshot);

        expect(restored.getText()).toBe("Hi");
    });


});
