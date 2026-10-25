
import type { Operation } from "./operation.ts";

export function validateOperation(
    input: unknown
): input is Operation {
    if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input)
    ) {
        return false;
    }

    const operation = input as Record<string, unknown>;

    if (
        typeof operation.id !== "string" ||
        operation.id.length === 0
    ) {
        return false;
    }

    if (operation.type === "insert") {
        if (
            typeof operation.value !== "string" ||
            operation.value.length !== 1 ||
            !(
                operation.after === null ||
                (
                    typeof operation.after === "string" &&
                    operation.after.length > 0
                )
            )
        ) {
            return false;
        }

        // backward compatibility during migration
        if (operation.timestamp === undefined) {
            return true;
        }

        return (
            typeof operation.timestamp === "number" &&
            Number.isSafeInteger(operation.timestamp) &&
            operation.timestamp >= 0
        );
    }

    if (operation.type === "delete") {
        return true;
    }

    return false;
}
