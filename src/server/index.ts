
import { WebSocketServer, WebSocket } from "ws";
import { DocumentManager } from "./document-manager.ts";
import { validateOperation } from "../crdt/validate-operation.ts";

export function createEditorServer(port = 8080) {
    const server = new WebSocketServer({
        host: "127.0.0.1",
        port
    });

    const documents = new DocumentManager();
    const clientDocuments = new Map<WebSocket, string>();

    server.on("connection", (socket: WebSocket) => {
        console.log("A client connected to the WebSocket server.");

        socket.on("message", (data) => {
            console.log("Received from browser:", data.toString());

            try {
                const message: unknown = JSON.parse(data.toString());

                if (
                    typeof message !== "object" ||
                    message === null ||
                    Array.isArray(message)
                ) {
                    socket.send(JSON.stringify({
                        type: "error",
                        message: "Message must be a JSON object."
                    }));
                    return;
                }

                const request = message as Record<string, unknown>;

                if (request.type === "join") {
                    if (
                        typeof request.documentId !== "string" ||
                        request.documentId.trim().length === 0
                    ) {
                        socket.send(JSON.stringify({
                            type: "error",
                            message: "A valid documentId is required."
                        }));
                        return;
                    }

                    const documentId = request.documentId;
                    clientDocuments.set(socket, documentId);

                    const document = documents.getDocument(documentId);

                    socket.send(JSON.stringify({
                        type: "document-state",
                        documentId,
                        snapshot: document.getSnapshot(),
                        text: document.getText()
                    }));

                    return;
                }

                if (request.type === "operation") {
                    const documentId = clientDocuments.get(socket);

                    if (!documentId) {
                        socket.send(JSON.stringify({
                            type: "error",
                            message: "Join a document before sending operations."
                        }));
                        return;
                    }

                    if (!validateOperation(request.operation)) {
                        socket.send(JSON.stringify({
                            type: "error",
                            message: "Invalid operation."
                        }));
                        return;
                    }

                    const document = documents.getDocument(documentId);

                    try {
                        document.apply(request.operation);
                    } catch (error) {
                        socket.send(JSON.stringify({
                            type: "error",
                            message: error instanceof Error
                                ? error.message
                                : "Could not apply operation."
                        }));
                        return;
                    }

                    console.log(
                        `Document "${documentId}" now contains: "${document.getText()}"`
                    );

                    const event = JSON.stringify({
                        type: "operation",
                        documentId,
                        operation: request.operation
                    });

                    for (const [client, joinedDocumentId] of clientDocuments) {
                        if (
                            joinedDocumentId === documentId &&
                            client.readyState === WebSocket.OPEN
                        ) {
                            client.send(event);
                        }
                    }

                    return;
                }

                socket.send(JSON.stringify({
                    type: "error",
                    message: "Unknown message type."
                }));
            } catch {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Message must contain valid JSON."
                }));
            }
        });

        socket.on("close", () => {
            console.log("Browser WebSocket connection closed.");
            clientDocuments.delete(socket);
        });

        socket.on("error", (error) => {
            console.error("WebSocket error:", error.message);
        });
    });

    server.on("error", (error) => {
        console.error("Server error:", error.message);
    });

    return server;
}

// starts the development server when this file is run directly
if (process.argv[1]?.replace(/\\/g, "/").endsWith("/src/server/index.ts")) {
    const server = createEditorServer();

    server.on("listening", () => {
        console.log("WebSocket server listening on port 8080");
    });

    console.log("WebSocket server starting on port 8080...");
}
