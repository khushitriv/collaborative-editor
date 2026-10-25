
import { RGA, type Character } from "../crdt/rga.ts";
import type { Operation } from "../crdt/operation.ts";

export class ClientDocument {
    private document = new RGA();

    apply(operation: Operation): void {
        this.document.apply(operation);
    }

    loadSnapshot(snapshot: Character[]): void {
        this.document.loadSnapshot(snapshot);
    }

    getText(): string {
        return this.document.getText();
    }

    getSnapshot(): Character[] {
        return this.document.getSnapshot();
    }
}
