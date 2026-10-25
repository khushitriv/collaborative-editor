
import { RGA } from "../crdt/rga.ts";

export class DocumentManager {
    private documents: Map<string, RGA> = new Map();

    getDocument(documentId: string): RGA {
        const existing = this.documents.get(documentId);

        if (existing) {
            return existing;
        }

        const document = new RGA();

        this.documents.set(documentId, document);

        return document;
    }

    getDocumentText(documentId: string): string {
        return this.getDocument(documentId).getText();
    }
}
