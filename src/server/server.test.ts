
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createEditorServer } from "./index.ts";

let server: ReturnType<typeof createEditorServer> | undefined;
let clients: WebSocket[] = [];

function connectClient(port: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}`);

        socket.once("open", () => {
            clients.push(socket);
            resolve(socket);
        });

        socket.once("error", reject);
    });
}

function receiveMessage(socket: WebSocket): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Timed out waiting for a WebSocket message."));
        }, 2000);

        socket.once("message", (data) => {
            clearTimeout(timer);
            resolve(JSON.parse(data.toString()));
        });

        socket.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

function waitForListening(
    instance: ReturnType<typeof createEditorServer>
): Promise<number> {
    return new Promise((resolve, reject) => {
        instance.once("listening", () => {
            const address = instance.address();

            if (address && typeof address !== "string") {
                resolve(address.port);
            } else {
                reject(new Error("Could not determine server port."));
            }
        });

        instance.once("error", reject);
    });
}

afterEach(async () => {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    }

    clients = [];

    if (server) {
        await new Promise<void>((resolve) => {
            server!.close(() => resolve());
        });

        server = undefined;
    }
});

describe("WebSocket document server", () => {
    it("sends the initial state when a client joins a document", async () => {
        server = createEditorServer(0);
        const port = await waitForListening(server);
        const client = await connectClient(port);

        const responsePromise = receiveMessage(client);

        client.send(JSON.stringify({
            type: "join",
            documentId: "room-1"
        }));

        const response = await responsePromise;

        expect(response).toEqual({
            type: "document-state",
            documentId: "room-1",
            snapshot: [],
            text: ""
        });
    });

    it("broadcasts an operation to clients in the same document", async () => {
        server = createEditorServer(0);
        const port = await waitForListening(server);

        const client1 = await connectClient(port);
        const client2 = await connectClient(port);

        const state1Promise = receiveMessage(client1);

        client1.send(JSON.stringify({
            type: "join",
            documentId: "room-1"
        }));

        await state1Promise;

        const state2Promise = receiveMessage(client2);

        client2.send(JSON.stringify({
            type: "join",
            documentId: "room-1"
        }));

        await state2Promise;

        const operationPromise = receiveMessage(client2);

        client1.send(JSON.stringify({
            type: "operation",
            operation: {
                type: "insert",
                id: "client-1:1",
                value: "H",
                after: null
            }
        }));

        const received = await operationPromise;

        expect(received.type).toBe("operation");
        expect(received.documentId).toBe("room-1");
        expect(received.operation.value).toBe("H");
    });

    it("does not broadcast operations to clients in other documents", async () => {
        server = createEditorServer(0);
        const port = await waitForListening(server);

        const client1 = await connectClient(port);
        const client2 = await connectClient(port);

        const state1Promise = receiveMessage(client1);

        client1.send(JSON.stringify({
            type: "join",
            documentId: "room-1"
        }));

        await state1Promise;

        const state2Promise = receiveMessage(client2);

        client2.send(JSON.stringify({
            type: "join",
            documentId: "room-2"
        }));

        await state2Promise;

        let receivedUnexpectedMessage = false;

        client2.on("message", () => {
            receivedUnexpectedMessage = true;
        });

        client1.send(JSON.stringify({
            type: "operation",
            operation: {
                type: "insert",
                id: "client-1:1",
                value: "H",
                after: null
            }
        }));

        // give the server time to broadcast, if it incorrectly do so
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(receivedUnexpectedMessage).toBe(false);
    });

    it("sends the existing document snapshot to a new client", async () => {
        server = createEditorServer(0);
        const port = await waitForListening(server);
        const documentId = "shared-snapshot-test";

        // first client joins the document
        const firstClient = await connectClient(port);

        const initialStatePromise = receiveMessage(firstClient);

        firstClient.send(JSON.stringify({
            type: "join",
            documentId
        }));

        await initialStatePromise;

        // first client inserts "H"
        const operationPromise = receiveMessage(firstClient);

        firstClient.send(JSON.stringify({
            type: "operation",
            operation: {
                type: "insert",
                id: "client-1:1",
                value: "H",
                after: null
            }
        }));

        await operationPromise;

        // A second client joins the same document later
        const secondClient = await connectClient(port);

        const secondClientStatePromise = receiveMessage(secondClient);

        secondClient.send(JSON.stringify({
            type: "join",
            documentId
        }));

        const response = await secondClientStatePromise;

        expect(response).toEqual({
            type: "document-state",
            documentId,
            snapshot: [
                {
                    id: "client-1:1",
                    value: "H",
                    after: null,
                    deleted: false
                }
            ],
            text: "H"
        });
    });
});
