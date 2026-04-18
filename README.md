📋 HR Workflow Designer
Tredence Analytics — Full Stack Engineering Intern Case Study

🧭 Overview
HR Workflow Designer is a browser-based visual workflow builder built for HR administrators to design, configure, and simulate internal HR processes — such as employee onboarding, leave approvals, and document verification — without writing any code.
The application is built with React + ReactFlow and runs entirely in the browser with no backend, no authentication, and no database. All state is managed in-memory, and a mock API layer simulates real backend interactions.

✨ Features
🎨 Visual Canvas (ReactFlow)

Drag-and-drop nodes from a sidebar onto an infinite canvas
Connect nodes with directional edges to define workflow order
Select, move, and delete nodes and edges freely
Auto-validation highlights broken connections or missing nodes

🧩 5 Custom Node Types
NodeColorPurposeStart🟢 GreenEntry point of the workflowTask🔵 BlueHuman task (e.g., collect documents)Approval🟣 PurpleManager or HR approval stepAutomated Step🟠 OrangeSystem-triggered action (e.g., send email)End🔴 RedWorkflow completion
📝 Node Configuration Forms
Each node has an editable side panel that appears on selection, with fields specific to that node type — including dynamic key-value metadata, dropdowns, toggles, and action-parameter fields.
🔌 Mock API Layer
An in-memory mock API provides:

GET /automations — returns available automated actions with their required parameters
POST /simulate — accepts a workflow graph and returns a step-by-step mock execution log

🧪 Workflow Sandbox
A simulation panel that:

Serializes the entire workflow graph to JSON
Validates structure (missing start node, disconnected nodes, cycles)
Runs a mock step-by-step execution and displays a readable log

📤 Export / Import

Export your workflow as a .json file
Re-import a saved workflow to continue editing


🏗️ Architecture
The entire application ships as a single self-contained HTML file for portability, with logic cleanly separated by comments into logical modules:
index.html
│
├── 🎨 Styles          — Minimalist CSS (white + #E05C00 orange accent)
│
├── 📦 Mock API        — MOCK_AUTOMATIONS, simulateWorkflow()
│
├── 🪝 Hooks
│   ├── useWorkflow    — nodes, edges, add/remove/update state
│   └── useSimulate    — workflow validation + simulation runner
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
├── 🖼️ Layout
│   ├── Sidebar        — Draggable node palette
│   ├── Canvas         — ReactFlow drop zone
│   └── ConfigPanel    — Right-side node editor
│
└── 🧪 SimulationPanel — Bottom bar execution log
Design Decisions

Single HTML file — Zero setup, runs directly in any modern browser
In-memory mock API — Mirrors real async API patterns without a server
Controlled forms — All node config is managed via React state for predictability
Separation of concerns — Canvas logic, form logic, and API logic are kept independent even within one file
Minimalist UI — Focus on usability and clarity over aesthetics, per the brief


🚀 How to Run

Download or clone the project
Open index.html in any modern browser (Chrome recommended)
That's it — no npm install, no build step

bash# Optional: serve locally to avoid any browser file restrictions
npx serve .
# or
python3 -m http.server 8080

🧪 How to Use

Drag a node type from the left sidebar onto the canvas
Connect nodes by dragging from one node's handle to another
Click any node to open its configuration form on the right
Fill in the node's fields (title, assignee, approver role, etc.)
Click "Run Simulation" to validate and simulate your workflow
Export your workflow as JSON to save it, or Import a previous one


✅ What's Completed

 React + ReactFlow canvas with drag-and-drop
 All 5 custom node types with distinct visuals
 Node configuration forms with all required fields
 Dynamic action parameters for Automated Step node (from mock API)
 Key-value metadata fields (add/remove rows)
 Mock API layer (GET /automations, POST /simulate)
 Workflow simulation with step-by-step log
 Graph validation (missing start, disconnected nodes, cycle detection)
 Export / Import workflow as JSON
 Minimalist, clean UI

🔮 What I Would Add With More Time

 Undo / Redo (using a history stack)
 Node templates (save a node config as reusable preset)
 Auto-layout (dagre-based graph arrangement)
 Mini-map for large workflows
 Validation error badges shown directly on nodes
 Node version history (track config changes per node)
 Persistent storage via localStorage


🛠️ Tech Stack
TechnologyPurposeReact 18UI frameworkReactFlow 11Graph canvas engineVanilla CSSStyling (no framework)In-memory JSMock API layer

📁 Submission
Built for Tredence Analytics — Full Stack Engineering Intern case study.
Time taken: ~5 hours
Focus: Architectural clarity, working functionality, clean abstractions