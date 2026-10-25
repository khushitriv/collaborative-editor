
import type { InsertOperation, Operation } from "./operation.ts";
import { validateOperation } from "./validate-operation.ts";

export type CharacterId = string;

export interface Character {
    id: CharacterId;
    value: string;
    after: CharacterId | null;
    deleted: boolean;
    timestamp?: number;
}

export class RGA {
    private characters: Map<CharacterId, Character> = new Map();

    private pendingInsertions: Map<CharacterId, InsertOperation> =
        new Map();

    private getTimestamp(timestamp: number | undefined): number {
        return timestamp ?? 0;
    }

    private compareCharacters(a: Character, b: Character): number {
        const timestampDifference =
            this.getTimestamp(b.timestamp) -
            this.getTimestamp(a.timestamp);

        if (timestampDifference !== 0) {
            return timestampDifference;
        }

        return a.id.localeCompare(b.id);
    }

    insert(
        id: CharacterId,
        value: string,
        after: CharacterId | null,
        timestamp?: number
    ): void {
        const existing = this.characters.get(id);

        if (existing) {
            if (
                existing.value === value &&
                existing.after === after &&
                this.getTimestamp(existing.timestamp) ===
                    this.getTimestamp(timestamp)
            ) {
                return;
            }

            throw new Error(`Conflicting insertion for character ID: ${id}`);
        }

        const pending = this.pendingInsertions.get(id);

        if (pending) {
            if (
                pending.value === value &&
                pending.after === after &&
                this.getTimestamp(pending.timestamp) ===
                    this.getTimestamp(timestamp)
            ) {
                return;
            }

            throw new Error(`Conflicting insertion for character ID: ${id}`);
        }

        if (value.length !== 1) {
            throw new Error(
                "Each insertion must contain exactly one character."
            );
        }

        if (after !== null && !this.characters.has(after)) {
            throw new Error(`Cannot insert after unknown character: ${after}`);
        }

        this.characters.set(id, {
            id,
            value,
            after,
            deleted: false,
            ...(timestamp === undefined ? {} : { timestamp })
        });

        // to resolve insertions that arrived before their parent
        for (const [pendingId, operation] of [...this.pendingInsertions]) {
            if (operation.after === id) {
                this.pendingInsertions.delete(pendingId);

                this.insert(
                    operation.id,
                    operation.value,
                    operation.after,
                    operation.timestamp
                );
            }
        }
    }

    delete(id: CharacterId): void {
        const character = this.characters.get(id);

        if (!character) {
            throw new Error(`Cannot delete unknown character: ${id}`);
        }

        character.deleted = true;
    }

    apply(operation: Operation): void {
        if (!validateOperation(operation)) {
            throw new Error("Invalid operation.");
        }

        if (operation.type === "delete") {
            this.delete(operation.id);
            return;
        }

        const existing = this.characters.get(operation.id);

        if (existing) {
            this.insert(
                operation.id,
                operation.value,
                operation.after,
                operation.timestamp
            );
            return;
        }

        const pending = this.pendingInsertions.get(operation.id);

        if (pending) {
            if (
                pending.value !== operation.value ||
                pending.after !== operation.after ||
                this.getTimestamp(pending.timestamp) !==
                    this.getTimestamp(operation.timestamp)
            ) {
                throw new Error(
                    `Conflicting insertion for character ID: ${operation.id}`
                );
            }

            return;
        }

        if (
            operation.after !== null &&
            !this.characters.has(operation.after)
        ) {
            this.pendingInsertions.set(operation.id, operation);
            return;
        }

        this.insert(
            operation.id,
            operation.value,
            operation.after,
            operation.timestamp
        );
    }

    getSnapshot(): Character[] {
        return Array.from(this.characters.values()).map(
            (character) => ({ ...character })
        );
    }

    loadSnapshot(snapshot: Character[]): void {
        const replacement = new Map<CharacterId, Character>();

        for (const character of snapshot) {
            if (
                !character ||
                typeof character.id !== "string" ||
                character.id.length === 0 ||
                typeof character.value !== "string" ||
                character.value.length !== 1 ||
                (character.after !== null &&
                    typeof character.after !== "string") ||
                typeof character.deleted !== "boolean" ||
                (
                    character.timestamp !== undefined &&
                    (
                        typeof character.timestamp !== "number" ||
                        !Number.isSafeInteger(character.timestamp) ||
                        character.timestamp < 0
                    )
                ) ||
                replacement.has(character.id)
            ) {
                throw new Error("Invalid document snapshot.");
            }

            replacement.set(character.id, { ...character });
        }

        for (const character of replacement.values()) {
            if (
                character.after !== null &&
                !replacement.has(character.after)
            ) {
                throw new Error("Snapshot references an unknown parent.");
            }

            if (character.after === character.id) {
                throw new Error("Snapshot character cannot be its own parent.");
            }
        }

        this.characters = replacement;
        this.pendingInsertions.clear();
    }

    getText(): string {
        const children = new Map<CharacterId | null, Character[]>();

        for (const character of this.characters.values()) {
            const siblings = children.get(character.after) ?? [];
            siblings.push(character);
            children.set(character.after, siblings);
        }

        for (const siblings of children.values()) {
            siblings.sort((a, b) => this.compareCharacters(a, b));
        }

        const result: string[] = [];
        const visited = new Set<CharacterId>();

        const visit = (parentId: CharacterId | null): void => {
            for (const character of children.get(parentId) ?? []) {
                if (visited.has(character.id)) {
                    continue;
                }

                visited.add(character.id);

                if (!character.deleted) {
                    result.push(character.value);
                }

                visit(character.id);
            }
        };

        visit(null);
        return result.join("");
    }
}
