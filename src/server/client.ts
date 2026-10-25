
import WebSocket from "ws";
import { ClientDocument } from "./client-document.ts";

const socket = new WebSocket("ws://localhost:8080");
const document = new ClientDocument();

socket.on("open", () => {
    console.log("Connected to the server!");

    socket.send(JSON.stringify({
        type: "join",
        documentId: "room-1"
    }));
});

socket.on("message", (data) => {
    const message = JSON.parse(data.toString());


    if (message.type === "document-state") {
        document.loadSnapshot(message.snapshot);

        console.log("Loaded document:", document.getText());

        if (document.getText() === "") {
            socket.send(JSON.stringify({
                type: "operation",
                operation: {
                    type: "insert",
                    id: "client-1:1",
                    value: "H",
                    after: null
                }
            }));
        }

        return;
    }

    if (message.type === "operation") {
        try {
            document.apply(message.operation);
            console.log("Local document text:", document.getText());
        } catch (error) {
            console.error("Could not apply operation locally:", error);
        }

        return;
    }

    if (message.type === "error") {
        console.error("Server error:", message.message);
    }
});

socket.on("close", () => {
    console.log("Disconnected from the server.");
});

socket.on("error", (error) => {
    console.error("Client error:", error.message);
});
