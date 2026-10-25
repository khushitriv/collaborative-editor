
import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:8080");

socket.on("open", () => {
    console.log("Client 2 connected!");

    socket.send(JSON.stringify({
        type: "join",
        documentId: "room-1"
    }));
});

socket.on("message", (data) => {
    const message = JSON.parse(data.toString());

    console.log("Client 2 received:", message);

    if (message.type === "document-state" && message.text === "H") {
        socket.send(JSON.stringify({
            type: "operation",
            operation: {
                type: "insert",
                id: "client-2:1",
                value: "i",
                after: "client-1:1"
            }
        }));
    }
});

socket.on("close", () => {
    console.log("Client 2 disconnected.");
});

socket.on("error", (error) => {
    console.error("Client 2 error:", error.message);
});
