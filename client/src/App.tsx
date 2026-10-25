
import { useEffect, useRef, useState } from "react";
import "./App.css";

type Character = {
  id: string;
  value: string;
  after: string | null;
  deleted: boolean;
  timestamp?: number;
};

type InsertOperation = {
  type: "insert";
  id: string;
  value: string;
  after: string | null;
  timestamp?: number;
};

type DeleteOperation = {
  type: "delete";
  id: string;
};

type Operation = InsertOperation | DeleteOperation;

type ServerMessage = {
  type: string;
  documentId?: string;
  snapshot?: Character[];
  operation?: Operation;
  message?: string;
};


function compareCharacters(a: Character, b: Character): number {
  const diff = (b.timestamp ?? 0) - (a.timestamp ?? 0);
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}


function getOrdered(characters: Character[]): Character[] {
  const children = new Map<string | null, Character[]>();

  for (const character of characters) {
    const siblings = children.get(character.after) ?? [];
    siblings.push(character);
    children.set(character.after, siblings);
  }

  for (const siblings of children.values()) siblings.sort(compareCharacters);

  const result: Character[] = [];
  const visited = new Set<string>();

  function visit(parentId: string | null) {
    for (const character of children.get(parentId) ?? []) {
      if (visited.has(character.id)) continue;
      visited.add(character.id);
      result.push(character);
      visit(character.id);
    }
  }

  visit(null);
  return result;
}

function getText(characters: Character[]): string {
  return getOrdered(characters)
    .filter((c) => !c.deleted)
    .map((c) => c.value)
    .join("");
}

function App() {
  const [status, setStatus] = useState("Connecting...");
  const [documentText, setDocumentText] = useState("");
  const [details, setDetails] = useState("Connecting to room-1...");

  const charactersRef = useRef<Character[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef(crypto.randomUUID());
  const counterRef = useRef(0);
  const clockRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);

  function refreshText() {
    setDocumentText(getText(charactersRef.current));
  }

  function applyOperation(operation: Operation) {
    const characters = charactersRef.current;

    if (operation.type === "insert") {
      const existing = characters.find((c) => c.id === operation.id);

      if (existing) return;

      
      if (
        operation.after !== null &&
        !characters.some((c) => c.id === operation.after)
      ) {
        setDetails("Received an insertion whose parent is missing. Please report this.");
        return;
      }

      characters.push({
        id: operation.id,
        value: operation.value,
        after: operation.after,
        deleted: false,
        timestamp: operation.timestamp,
      });

      clockRef.current = Math.max(clockRef.current, operation.timestamp ?? 0);
    } else {
      const character = characters.find((c) => c.id === operation.id);
      if (character) character.deleted = true;
    }

    refreshText();
  }

  function sendOperation(operation: Operation) {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "operation", operation }));
    }
  }

  useEffect(() => {
    let socket: WebSocket | null = null;

    const timer = window.setTimeout(() => {
      socket = new WebSocket("ws://127.0.0.1:8080");
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setStatus("Connected");
        socket?.send(JSON.stringify({ type: "join", documentId: "room-1" }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;

          if (message.type === "document-state" && message.snapshot) {
            charactersRef.current = message.snapshot.map((c) => ({ ...c }));
            clockRef.current = Math.max(
              0,
              ...charactersRef.current.map((c) => c.timestamp ?? 0)
            );
            refreshText();
            setDetails(`Loaded document: ${message.documentId ?? "room-1"}`);
          }

          if (message.type === "operation" && message.operation) {
            applyOperation(message.operation);
          }

          if (message.type === "error") {
            setDetails(`Server error: ${message.message ?? "Unknown error"}`);
          }
        } catch {
          setDetails("Could not read a server message.");
        }
      });

      socket.addEventListener("error", () => {
        setStatus("Connection error");
        setDetails("Could not connect to the backend.");
      });

      socket.addEventListener("close", () => {
        setStatus("Disconnected");
      });
    }, 50);

    return () => {
      window.clearTimeout(timer);
      socket?.close();

      if (socketRef.current === socket) socketRef.current = null;
    };
  }, []);

  function handleChange(nextText: string) {
    if (composingRef.current) {
      setDocumentText(nextText);
      return;
    }

    const oldCharacters = charactersRef.current;
    const oldText = getText(oldCharacters);

    if (nextText === oldText) return;

    
    let prefix = 0;
    while (
      prefix < oldText.length &&
      prefix < nextText.length &&
      oldText[prefix] === nextText[prefix]
    ) {
      prefix++;
    }

    
    let oldEnd = oldText.length;
    let newEnd = nextText.length;

    while (
      oldEnd > prefix &&
      newEnd > prefix &&
      oldText[oldEnd - 1] === nextText[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }

    const visible = getOrdered(oldCharacters).filter((c) => !c.deleted);

    const removed = visible.slice(prefix, oldEnd);

    for (const character of removed.reverse()) {
      const operation: DeleteOperation = {
        type: "delete",
        id: character.id,
      };

      applyOperation(operation);
      sendOperation(operation);
    }

    let after = prefix > 0 ? visible[prefix - 1].id : null;

    for (const value of nextText.slice(prefix, newEnd)) {
      const operation: InsertOperation = {
        type: "insert",
        id: `${clientIdRef.current}:${++counterRef.current}`,
        value,
        after,
        timestamp: ++clockRef.current,
      };

      applyOperation(operation);
      sendOperation(operation);
      after = operation.id;
    }

    refreshText();
  }

  return (
    <main>
      <h1>Collaborative Editor</h1>
      <p>Backend status: <strong>{status}</strong></p>
      <p>Document: room-1</p>
      <p>{details}</p>

      <textarea
        ref={textareaRef}
        value={documentText}
        onChange={(event) => handleChange(event.target.value)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          handleChange(event.currentTarget.value);
        }}
        placeholder="Start typing..."
        rows={12}
      />
    </main>
  );
}

export default App;
