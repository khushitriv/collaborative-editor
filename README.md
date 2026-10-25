# Real time collaborative text editor

This project is a browser-based collaborative text editor built with React, TypeScript, Node.js, WebSockets, and a custom replicated growable array (RGA) CRDT. Multiple browser clients can edit the same document and receive updates in real time.

## Project Features

In the current state, this project consists of the following features:

- Real-time collaboration: it synchronizes document operations between multiple browser clients over WebSockets.

- Custom CRDT: Implements an RGA sequence CRDT without relying on a CRDT library.

- Character-level editing: supports insertion and deletion at different positions including backspace and forward deletion.

- Determine deterministic ordering orders sibling insertions using timestamps and character IDs.

- Document snapshots supports capturing and restoring document state.

- Operation handling. Validates operation, handles duplicate insertions, rejects conflicting IDs, and processes insertions that arrive before their parent.

- Automated tests covers core editing behavior, ordering snapshots, duplicate operations out of order insertions and selected replica convergence scenarios.

## Tech Stack

- Frontend: React, TypeScript, Vite

- Backend: Node.js, TypeScript

- Communication: WebSockets(ws)

- Data structure: custom RGS CRDT

- Testing: Vitest

## Architechture

```bash
React + TypeScript clients
          |
          | WebSocket connection
          v
    Node.js server
          |
          | Operations and snapshots
          v
     Custom RGA CRDT
          |
          v
 Synchronized document views
``` 

Each character has a unique idea value reference to the character it forms. Follows a deletion flag and an optional timestamp. Deleted characters are retained as tombstones to prevent document relationships.

When a user edits the text, the client identifies the changed range, creates an insertion and deletion operations, applies them locally and sends them to the server. The server processes operations and broadcasts them to connected clients.

## Project structure
```bash
collaborative-editor/
├── client/
│   ├── src/
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── package.json
├── src/
│   ├── crdt/
│   │   ├── operation.ts
│   │   ├── operation.test.ts
│   │   ├── rga.ts
│   │   ├── rga.test.ts
│   │   ├── validate-operation.ts
│   │   └── validate-operation.test.ts
│   └── server/
│       ├── client.ts
│       ├── client-document.ts
│       ├── client-document.test.ts
│       ├── client2.ts
│       ├── document-manager.ts
│       ├── document-manager.test.ts
│       ├── index.ts
│       └── server.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started 

### Prerequisites 
- Node.js and npm 
- A modern web browser 

#### 1. Install dependencies 
 From the project root: 
```bash
npm install
```
 
 Install frontend dependencies: 
```bash
 cd client 
 npm install 
 cd ..
 ```
#### 2. Start the backend 

From the project root: 
```bash
npm run dev:server 
```
The WebSocket server is configured to listen on 127.0.0.1:8080. 

#### 3. Start the frontend 

In a second terminal: 
```bash
cd client 
npm run dev
```
Open the local URL printed by Vite. 

Open the same URL in multiple browser tabs to test collaboration in the shared room-1 document. 

Note: The current WebSocket address and document room are hard-coded for local development. Production deployment requires additional configuration. 

## Running Tests 

From the project root: 
```bash
npm test 
```

Run tests in watch mode: 
```bash
npm run test:watch
```

The test suite covers: 

- Empty documents and sequential insertion 
- Deterministic sibling ordering 
- Deletion and preservation of descendants 
- Duplicate and conflicting character IDs 
- Out-of-order insertion processing 
- Snapshot restoration 
- Selected replica-convergence scenarios  

Passing these tests verifies the behaviors covered by the suite, it does not establish correctness for every possible concurrent edit or network failure. 

## CRDT Design 

The implementation uses an RGA-style model: 

- Character IDs: uniquely identify inserted characters. 
- Parent relationships (after): connect characters to the character they follow.
- Timestamps and IDs: determine sibling ordering. 
- Tombstones: retain deleted characters in the internal document structure. 
- Snapshots: capture character state for restoration or initial synchronization. Pending insertions wait for their referenced parent to arrive. 

The project demonstrates the principles behind replicated sequence data structures and real-time collaboration, including operation propagation, deterministic ordering, and replica synchronization. 

## Current Limitations 

- The frontend uses a fixed WebSocket address and a single hard-coded document room. 
- Durable persistence across server restarts is not implemented. 
- Authentication, authorization, and document permissions are not included. 
- Reconnection and recovery behavior need dedicated testing. 
- Broader concurrent-edit scenarios and automated multi-client WebSocket integration tests remain future improvements. 

## Future Improvements 

- Add automated multi-client WebSocket integration tests. 
- Test simultaneous insertions and insertion/deletion races systematically. Add persistent storage and recovery across server restarts. 
- Support multiple documents and configurable server URLs. 
- Add reconnection handling, user presence, and shared cursors. 
- Deploy the application using secure WebSockets (wss://).
