<div align="center">

# 🔶 HRFlow Designer

### Tredence Analytics — Full Stack Engineering Intern Case Study

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![ReactFlow](https://img.shields.io/badge/ReactFlow-11-FF0072?style=flat-square)
![Vanilla CSS](https://img.shields.io/badge/CSS-Vanilla-264DE4?style=flat-square&logo=css3)
![No Build](https://img.shields.io/badge/Build-None%20Required-22C55E?style=flat-square)
![Single File](https://img.shields.io/badge/Delivery-Single%20HTML%20File-E05C00?style=flat-square)

**A browser-based visual HR workflow builder — drag, connect, configure, simulate.**

[▶ Live Demo](#how-to-run) · [📋 Features](#features) · [🏗 Architecture](#architecture) · [🧪 Simulation](#workflow-simulation)

</div>

---

## Overview

HRFlow Designer is a visual workflow builder for HR administrators to design and simulate internal HR processes — such as **employee onboarding**, **leave approvals**, and **document verification** — without writing any code.

Built with **React + ReactFlow**, it runs entirely in the browser with no backend, no authentication, and no database. All state is managed in-memory, and a mock API layer simulates real backend interactions.

> ⏱ Built within a 4–6 hour time-box. Focus: architectural clarity and working functionality.

---

## How to Run
🚀 Quick Start
"Ensure you have Node.js installed: https://nodejs.org/"
Each step should have a bold heading and a bash code block.

This project is built with React + Vite. Node.js must be installed.

Show these exact steps:

Step 1 — Clone and navigate to the project:
  git clone <your-repo-url>
  cd hrflow-designer

Step 2 — Install dependencies:
  npm install

Step 3 — Start the development server:
  npm run dev

Step 4 — Open in browser:
  Navigate to http://localhost:5173 
  (or the port shown in your terminal)
🚀 Quick Start
---

## Features

### 🎨 Visual Canvas
- Drag-and-drop nodes from sidebar onto an infinite ReactFlow canvas
- Connect nodes with directional edges to define workflow order
- Select, move, and delete nodes and edges freely
- **Mini-map** for navigating large workflows
- **Auto-layout** button — arranges nodes left-to-right via topological sort (no external library)
- Zoom controls, fit-to-view, and canvas lock

---

### 🧩 5 Custom Node Types

| Node | Color | Purpose |
|------|-------|---------|
| **Start** | 🟢 Green | Workflow entry point |
| **Task** | 🔵 Blue | Human task (e.g., collect documents) |
| **Approval** | 🟣 Purple | Manager or HR approval step |
| **Automated Step** | 🟠 Orange | System-triggered action (e.g., send email) |
| **End** | 🔴 Red | Workflow completion |

---

### 📝 Node Configuration Forms

Each node has a **dedicated side panel** that slides in from the right on selection:

| Node | Fields |
|------|--------|
| Start | Title, metadata key-value pairs |
| Task | Title\*, description, assignee, due date, custom fields, summary toggle |
| Approval | Title, approver role (Manager / HRBP / Director), auto-approve threshold |
| Automated Step | Title, action dropdown (from mock API), dynamic action parameters |
| End | End message |

> All fields are **controlled components** — changes update the canvas node instantly.

---

### 🔌 Mock API Layer

Mirrors real backend interaction patterns without a server:
GET  /automations   →  Returns available automated actions + required params
POST /simulate      →  Accepts workflow JSON, returns step-by-step execution log

**Available mock actions:**
```json
[
  { "id": "send_email",    "label": "Send Email",         "params": ["to", "subject"] },
  { "id": "generate_doc",  "label": "Generate Document",  "params": ["template", "recipient"] },
  { "id": "notify_slack",  "label": "Notify Slack",       "params": ["channel", "message"] }
]
```

---

### 🧪 Workflow Simulation

Click **Run Simulation** to validate and execute your workflow:
✅  Step 1  |  START     |  "Onboarding Start"          →  Workflow initiated          80ms
✅  Step 2  |  TASK      |  "Collect Documents"          →  Assigned to HR Team        120ms
⏳  Step 3  |  APPROVAL  |  "Manager Review"             →  Sent to Manager — pending  —
✅  Step 4  |  AUTO      |  "Send Email"                 →  Executed with 2 params     340ms
✅  Step 5  |  END       |  "Process Complete"           →  Workflow complete           400ms
─────────────────────────────────────────────────
5 steps  |  4 succeeded  |  1 pending  |  940ms total

- Rows animate in one-by-one (200ms delay) for a "running" feel
- Raw workflow JSON viewable in a collapsible block below the log

---

### ✅ Validation Engine

Runs on every state change, showing errors **directly on nodes**:
Rule 1: Canvas must have exactly one Start Node
Rule 2: Every node (except Start) must have ≥ 1 incoming edge
Rule 3: Every node (except End) must have ≥ 1 outgoing edge
Rule 4: No cycles allowed — detected via DFS
Rule 5: Task Node title must not be empty

- **⚠ badge** appears on invalid nodes with hover tooltip showing exact error
- **Status bar** at the bottom shows: `Nodes: 5  |  Edges: 4  |  ✅ Valid workflow`

---

### ↩ Undo / Redo

- Full history stack — 50 snapshot limit
- Captures: node add/move/delete, edge changes, form edits (debounced 800ms)
- `Ctrl+Z` to undo, `Ctrl+Y` / `Ctrl+Shift+Z` to redo
- Toolbar buttons with disabled state and history counter (`History: 4/12`)

---

### 📤 Export / Import

- **Export** — downloads the full workflow graph as a `.json` file
- **Import** — loads a previously saved workflow JSON back onto the canvas

---

### 🖱 Right-Click Context Menu

Right-click any node for quick actions:

| Action | Behavior |
|--------|----------|
| ✏️ Edit Node | Opens config panel for that node |
| 📋 Duplicate Node | Clones node at +40px offset |
| 🔗 Copy Node ID | Copies ID to clipboard with toast |
| 🗑️ Delete Node | Removes node + all connected edges |

---

### ⚡ Workflow Templates

One-click pre-built workflows on the empty canvas:

| Template | Flow |
|----------|------|
| Onboarding Flow | Start → Task → Approval → Automated Step → End |
| Leave Approval | Start → Task → Approval → End |
| Doc Verification | Start → Task → Automated Step → End |

---

## Architecture

Ships as a **single self-contained HTML file** for portability, with logic cleanly separated by section comments:
index.html
│
├── 🎨 Styles .............. Minimalist CSS (#E05C00 orange, system-ui font)
│
├── 📦 Mock API
│   ├── MOCK_AUTOMATIONS .. Static list of automated actions + params
│   └── simulateWorkflow() . Topological walk + mock step execution
│
├── 🪝 Hooks
│   ├── useWorkflow ........ nodes, edges, add/update/remove state
│   ├── useHistory ......... undo/redo stack (50 snapshots, debounced)
│   └── useSimulate ........ validation logic + simulation runner
│
├── 🧩 Node Renderers
│   ├── StartNode
│   ├── TaskNode
│   ├── ApprovalNode
│   ├── AutomatedStepNode
│   └── EndNode
│
├── 📝 Config Forms
│   ├── StartForm
│   ├── TaskForm
│   ├── ApprovalForm
│   ├── AutomatedStepForm
│   └── EndForm
│
├── 🖼 Layout
│   ├── Navbar ............. Logo, Undo/Redo, Import, Export, Run Simulation
│   ├── Sidebar ............ Node palette, live counters, canvas summary, tips
│   ├── Canvas ............. ReactFlow drop zone + minimap + controls
│   └── ConfigPanel ........ Right-side node editor (slides in on selection)
│
└── 🧪 SimulationPanel ..... Bottom drawer — animated timeline + validation log

### Design Decisions

**Single HTML File**
> Chosen for zero-setup portability. Runs by double-clicking — no Node.js or build tools needed. In production this would be a Vite/Next.js project with proper module separation.

**In-Memory Mock API**
> Mirrors real async patterns (async/await, try/catch, response shaping). Designed so mock functions can be swapped for real `fetch()` calls with minimal changes — the API contract is already defined.

**Controlled Forms**
> Every config field is a React controlled component. Changes update ReactFlow node data immediately, keeping the canvas and config panel always in sync.

**Separation of Concerns**
> Canvas logic, form logic, validation, and API interaction are independent sections even within one file. Each can be extracted into its own module with minimal refactoring.

---

## Assessment Criteria

| Area | What Was Delivered |
|------|--------------------|
| **React Flow proficiency** | Custom node renderers, edge management, drag-drop, minimap, auto-layout |
| **React architecture** | Custom hooks, separation of concerns, controlled components |
| **Complex form handling** | Dynamic fields, key-value pairs, validation, conditional rendering |
| **Mock API interaction** | Async patterns, GET /automations, POST /simulate, response shaping |
| **Scalability** | New node type = one renderer + one form, zero other changes needed |
| **Communication** | README with architecture, design decisions, assumptions, tradeoffs |
| **Delivery speed** | Full prototype + 8 UX improvements within the time-box |

---

## Completed vs. Would Add

### ✅ Completed
- [x] ReactFlow canvas with full drag-and-drop
- [x] All 5 custom node types with distinct visuals
- [x] Node configuration forms with all required fields
- [x] Dynamic action parameters for Automated Step node
- [x] Key-value metadata with add/remove row support
- [x] Mock API — GET /automations + POST /simulate
- [x] Animated workflow simulation timeline
- [x] Graph validation with node badges + status bar
- [x] Export / Import workflow JSON
- [x] Undo / Redo with keyboard shortcuts
- [x] Auto-layout (topological sort, no external library)
- [x] Minimap for large workflow navigation
- [x] Right-click context menu
- [x] Workflow templates on empty canvas
- [x] Canvas summary with live node type counters

### 🔮 Would Add With More Time
- [ ] `localStorage` persistence (save/restore session)
- [ ] Node version history (track config changes per node)
- [ ] Node templates (save configured node as reusable preset)
- [ ] Validation error highlights on edges (not just nodes)
- [ ] Keyboard accessibility (full Tab/Enter form navigation)
- [ ] Real backend (Express + PostgreSQL)
- [ ] Multi-user collaboration via WebSockets

---

## Assumptions

| Assumption | Reason |
|------------|--------|
| No authentication | Per brief — not required |
| No backend persistence | Per brief — Export/Import JSON covers manual saving |
| Single HTML file | Zero-setup demo delivery; production would use Vite/Next.js |
| CDN versions pinned | Ensures consistent behavior regardless of when file is opened |

---

<div align="center">

Built for **Tredence Analytics** — Full Stack Engineering Intern Case Study

*No authentication or backend persistence required per the brief.*

</div>