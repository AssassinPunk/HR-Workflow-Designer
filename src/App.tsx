import React, { useState, useRef, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  NodeTypes as RFNodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { StartNode, TaskNode, ApprovalNode, AutomatedNode, EndNode } from './components/NodeTypes';
import { simulateWorkflow } from './api/mockApi';

const nodeTypes: RFNodeTypes = {
  start: StartNode,
  task: TaskNode,
  approval: ApprovalNode,
  automated: AutomatedNode,
  end: EndNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const WorkflowDesigner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSandbox, setShowSandbox] = useState(false);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const titleLabel = type === 'start' ? 'Start' : 
                         type === 'end' ? 'End' : 
                         type.charAt(0).toUpperCase() + type.slice(1);

      const newNode = {
        id: getId(),
        type,
        position,
        data: { title: titleLabel },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onSelectionChange = useCallback(({ nodes }: any) => {
    if (nodes.length === 1) {
      setSelectedNodeId(nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  const updateNodeData = useCallback((id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = newData;
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setShowSandbox(true);
    setLog([]);
    setErrors([]);
    
    // Slight artificial delay for UX
    await new Promise(r => setTimeout(r, 600));

    const result = await simulateWorkflow(nodes, edges);
    setLog(result.log);
    setErrors(result.errors);
    setIsSimulating(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="h-[56px] border-b border-[#E5E7EB] flex items-center justify-between px-[20px] shrink-0">
        <div className="flex items-center gap-[8px] font-bold text-[#E05C00]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> 
          HRFlow Designer
        </div>
        <div className="flex gap-[12px] items-center">
           <label className="cursor-pointer bg-white border border-[#E5E7EB] px-[12px] py-[6px] text-[12px] rounded-[4px] text-[#111827] hover:bg-[#F9FAFB] transition">
             Import JSON
             <input 
               type="file" 
               accept=".json"
               className="hidden"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 const reader = new FileReader();
                 reader.onload = (event) => {
                   try {
                     const data = JSON.parse(event.target?.result as string);
                     if (data.nodes && data.edges) {
                       setNodes(data.nodes);
                       setEdges(data.edges);
                       setSelectedNodeId(null);
                     }
                   } catch(err) {
                     console.error("Invalid JSON file");
                   }
                 };
                 reader.readAsText(file);
               }}
             />
           </label>
           <button 
             onClick={() => {
                const data = JSON.stringify({ nodes, edges }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'workflow.json';
                a.click();
             }}
             className="bg-white border border-[#E5E7EB] px-[12px] py-[6px] text-[12px] rounded-[4px] text-[#111827] hover:bg-[#F9FAFB] transition"
           >
             Export JSON
           </button>
           <button 
             onClick={handleRunSimulation}
             className="bg-[#E05C00] text-white px-[16px] py-[10px] text-[13px] rounded-[6px] font-semibold hover:bg-[#c95200] transition disabled:opacity-50"
           >
             Run Simulation
           </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        <div className="flex-1 relative bg-[#F8F9FA]" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ style: { stroke: '#CBD5E1', strokeWidth: 2 } }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            className="react-flow-wrapper"
          >
            <Background color="#E5E7EB" gap={20} size={1} />
            <Controls />
          </ReactFlow>
        </div>

        <ConfigPanel selectedNode={selectedNode} updateNodeData={updateNodeData} deleteNode={(id: string) => setNodes((nds) => nds.filter((n) => n.id !== id))} />
      </div>

      {/* Simulation Bar */}
      {showSandbox && (
        <div className="h-[160px] border-t border-[#E5E7EB] bg-[#F9FAFB] py-[16px] px-[20px] overflow-y-auto shrink-0 z-20">
          <div className="flex justify-between items-center mb-[12px]">
            <div className="block text-[11px] font-semibold uppercase text-[#6B7280]">Simulation Log</div>
            <button onClick={() => setShowSandbox(false)} className="text-[#6B7280] hover:text-[#111827] text-[11px] uppercase font-bold">
               Close
            </button>
          </div>

          {isSimulating ? (
            <div className="text-[12px] text-[#6B7280] italic ml-[24px]">Running simulation...</div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {errors.length > 0 && (
                <div className="text-[#EF4444] text-[12px] font-medium ml-[24px]">
                  {errors.map((err, i) => (
                    <div key={i}>Action Required: {err}</div>
                  ))}
                </div>
              )}

              {log.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-[10px] text-[12px]">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span>Step {entry.step}: <strong>{entry.label}</strong> — <span className="text-[#6B7280]">{entry.message}</span></span>
                </div>
              ))}

              {log.length > 0 && errors.length === 0 && (
                <div className="text-[#6B7280] text-[12px] italic ml-[24px]">
                  Simulation completed successfully.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <WorkflowDesigner />
    </ReactFlowProvider>
  );
}
