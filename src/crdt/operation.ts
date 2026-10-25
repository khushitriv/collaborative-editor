
import type { CharacterId } from "./rga.ts";

export interface InsertOperation {
    type: "insert";
    id: CharacterId;
    value: string;
    after: CharacterId | null;
    timestamp?: number;
}

export interface DeleteOperation {
    type: "delete";
    id: CharacterId;
}

export type Operation = InsertOperation | DeleteOperation;
