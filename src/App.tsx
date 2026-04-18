import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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

export const ValidationContext = React.createContext<{ nodeErrors: Record<string, string[]> }>({ nodeErrors: {} });

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

  // Validation Logic
  const validationState = useMemo(() => {
    const nodeErrs: Record<string, string[]> = {};
    const globalErrs: string[] = [];
    let errCount = 0;

    const addErr = (nodeId: string, msg: string) => {
      if (!nodeErrs[nodeId]) nodeErrs[nodeId] = [];
      if (!nodeErrs[nodeId].includes(msg)) {
        nodeErrs[nodeId].push(msg);
        errCount++;
      }
    };

    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      globalErrs.push('A Start Node must exist on the canvas');
      errCount++;
    }
    if (startNodes.length > 1) {
      startNodes.forEach(n => addErr(n.id, 'There can only be ONE Start Node'));
    }

    nodes.forEach(node => {
      const incoming = edges.filter(e => e.target === node.id).length;
      const outgoing = edges.filter(e => e.source === node.id).length;

      if (node.type !== 'start' && incoming === 0) {
        addErr(node.id, 'Missing incoming connection');
      }
      if (node.type !== 'end' && outgoing === 0) {
        addErr(node.id, 'Missing outgoing connection');
      }
      if (node.type === 'task' && (!node.data?.title || (node.data.title as string).trim() === '')) {
        addErr(node.id, 'Title is required');
      }
    });

    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleNodes = new Set<string>();

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path);
        } else if (recStack.has(neighbor)) {
          const startIdx = path.indexOf(neighbor);
          for (let i = startIdx; i < path.length; i++) {
            cycleNodes.add(path[i]);
          }
        }
      }
      recStack.delete(nodeId);
      path.pop();
    };

    nodes.forEach(n => {
      if (!visited.has(n.id)) dfs(n.id, []);
    });

    cycleNodes.forEach(nid => addErr(nid, 'Node is part of a cycle'));

    return { nodeErrors: nodeErrs, globalErrors: globalErrs, totalErrors: errCount + globalErrs.length };
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Prevent self-loops
      if (sourceNode.id === targetNode.id) return false;

      // Prevent Start Node as target
      if (targetNode.type === 'start') return false;

      // Prevent End Node as source
      if (sourceNode.type === 'end') return false;

      // Prevent duplicate edges between the same source and target
      const existingEdge = edges.find(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (existingEdge) return false;

      return true;
    },
    [nodes, edges]
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
    <ValidationContext.Provider value={{ nodeErrors: validationState.nodeErrors }}>
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
              isValidConnection={isValidConnection}
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

          <ConfigPanel 
            selectedNode={selectedNode} 
            updateNodeData={updateNodeData} 
            deleteNode={(id: string) => setNodes((nds) => nds.filter((n) => n.id !== id))}
            onClose={() => setSelectedNodeId(null)} 
          />
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

        {/* Global Validation Status Bar */}
        <div className="h-[32px] w-full bg-[#f8f8f8] border-t border-[#eee] text-[12px] flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center gap-4 text-gray-700">
            <span>Nodes: {nodes.length}</span>
            <span className="text-gray-300">|</span>
            <span>Edges: {edges.length}</span>
            <span className="text-gray-300">|</span>
            {validationState.totalErrors === 0 ? (
              <span className="text-green-600 font-medium whitespace-nowrap">✅ Valid workflow</span>
            ) : (
              <span className="text-red-500 font-medium whitespace-nowrap flex items-center gap-1 group relative cursor-help">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {validationState.totalErrors} validation error{validationState.totalErrors !== 1 ? 's' : ''}
                
                {validationState.globalErrors.length > 0 && (
                  <div className="hidden group-hover:block absolute bottom-full mb-2 left-0 w-max max-w-[300px] bg-gray-800 text-white text-[11px] p-2 rounded shadow-lg whitespace-pre-wrap text-left z-50">
                    {validationState.globalErrors.map((e, idx) => <div key={idx}>• {e}</div>)}
                  </div>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </ValidationContext.Provider>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <WorkflowDesigner />
    </ReactFlowProvider>
  );
}
