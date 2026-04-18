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
  MiniMap,
  NodeTypes as RFNodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { StartNode, TaskNode, ApprovalNode, AutomatedNode, EndNode } from './components/NodeTypes';
import { simulateWorkflow } from './api/mockApi';

export const ValidationContext = React.createContext<{ nodeErrors: Record<string, string[]> }>({ nodeErrors: {} });

const TYPE_COLORS: Record<string, string> = {
  START: '#10B981',
  TASK: '#3B82F6',
  APPROVAL: '#8B5CF6',
  AUTOMATED: '#E05C00',
  END: '#EF4444'
};

const nodeTypes: RFNodeTypes = {
  start: StartNode,
  task: TaskNode,
  approval: ApprovalNode,
  automated: AutomatedNode,
  end: EndNode,
};

const nodeColor = (node: any) => {
  switch (node.type) {
    case 'start': return '#10B981';
    case 'task': return '#3B82F6';
    case 'approval': return '#8B5CF6';
    case 'automated': return '#E05C00';
    case 'end': return '#EF4444';
    default: return '#eee';
  }
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

  const loadTemplate = useCallback((type: string) => {
    let templateNodes: any[] = [];
    let templateEdges: any[] = [];
    
    if (type === 'onboarding') {
      const s = getId();
      const t = getId();
      const a = getId();
      const au = getId();
      const e = getId();
  
      templateNodes = [
        { id: s, type: 'start', position: { x: 100, y: 150 }, data: { title: 'Start' } },
        { id: t, type: 'task', position: { x: 320, y: 150 }, data: { title: 'Collect Docs' } },
        { id: a, type: 'approval', position: { x: 540, y: 150 }, data: { title: 'Manager Approval' } },
        { id: au, type: 'automated', position: { x: 760, y: 150 }, data: { title: 'Send Email', action: 'send_email', action_params: {to: 'employee@company.com', subject: 'Welcome'} } },
        { id: e, type: 'end', position: { x: 980, y: 150 }, data: { title: 'End' } }
      ];
      templateEdges = [
        { id: `e-${s}-${t}`, source: s, target: t },
        { id: `e-${t}-${a}`, source: t, target: a },
        { id: `e-${a}-${au}`, source: a, target: au },
        { id: `e-${au}-${e}`, source: au, target: e }
      ];
    } else if (type === 'leave') {
      const s = getId();
      const t = getId();
      const a = getId();
      const e = getId();
      
      templateNodes = [
        { id: s, type: 'start', position: { x: 100, y: 150 }, data: { title: 'Start' } },
        { id: t, type: 'task', position: { x: 320, y: 150 }, data: { title: 'Fill Form' } },
        { id: a, type: 'approval', position: { x: 540, y: 150 }, data: { title: 'HRBP Approval' } },
        { id: e, type: 'end', position: { x: 760, y: 150 }, data: { title: 'End' } }
      ];
      templateEdges = [
        { id: `e-${s}-${t}`, source: s, target: t },
        { id: `e-${t}-${a}`, source: t, target: a },
        { id: `e-${a}-${e}`, source: a, target: e }
      ];
    } else if (type === 'docs') {
      const s = getId();
      const t = getId();
      const au = getId();
      const e = getId();
  
      templateNodes = [
        { id: s, type: 'start', position: { x: 100, y: 150 }, data: { title: 'Start' } },
        { id: t, type: 'task', position: { x: 320, y: 150 }, data: { title: 'Upload Docs' } },
        { id: au, type: 'automated', position: { x: 540, y: 150 }, data: { title: 'Generate PDF', action: 'generate_doc', action_params: {template: 'Verification', recipient: 'Employee'} } },
        { id: e, type: 'end', position: { x: 760, y: 150 }, data: { title: 'End' } }
      ];
      templateEdges = [
        { id: `e-${s}-${t}`, source: s, target: t },
        { id: `e-${t}-${au}`, source: t, target: au },
        { id: `e-${au}-${e}`, source: au, target: e }
      ];
    }
    
    setNodes(templateNodes);
    setEdges(templateEdges);
    setTimeout(() => {
        if(reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
        }
    }, 50);
  }, [setNodes, setEdges, reactFlowInstance]);

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
    if (validationState.totalErrors > 0) {
      alert("Cannot run simulation: Workflow has validation errors. Please check the nodes and fix any issues first.");
      return;
    }

    setIsSimulating(true);
    setShowSandbox(true);
    setLog([]);
    setErrors([]);
    
    // Slight artificial delay for UX
    await new Promise(r => setTimeout(r, 600));

    const result = await simulateWorkflow(nodes, edges);
    if (!result.success) {
      setErrors(result.errors || []);
      setIsSimulating(false);
      return;
    }

    const fullLog = result.log || [];
    // Animate rows appearing one by one with 200ms delay between each
    for (let i = 0; i < fullLog.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        setLog(prev => [...prev, fullLog[i]]);
    }
    
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
              <MiniMap 
                nodeColor={nodeColor}
                maskColor="rgba(0,0,0,0.08)"
                style={{ border: '1px solid #eee', borderRadius: 8, bottom: 48, right: 16 }}
              />
            </ReactFlow>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center pointer-events-auto bg-white/90 p-8 rounded-2xl backdrop-blur-sm border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="text-[64px] mb-[16px] leading-none">🎯</div>
                  <h2 className="text-[18px] text-[#333] font-bold mb-[8px]">Start building your workflow</h2>
                  <p className="text-[14px] text-[#888] mb-[24px]">Drag any node from the left sidebar to begin</p>
                  <div className="flex gap-[12px] justify-center items-center">
                    <button onClick={() => loadTemplate('onboarding')} className="px-[12px] py-[6px] border border-[#E5E7EB] rounded-full text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB] transition shadow-sm bg-white hover:border-[#E05C00] hover:text-[#E05C00]">
                      + Onboarding Flow
                    </button>
                    <button onClick={() => loadTemplate('leave')} className="px-[12px] py-[6px] border border-[#E5E7EB] rounded-full text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB] transition shadow-sm bg-white hover:border-[#E05C00] hover:text-[#E05C00]">
                      + Leave Approval
                    </button>
                    <button onClick={() => loadTemplate('docs')} className="px-[12px] py-[6px] border border-[#E5E7EB] rounded-full text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB] transition shadow-sm bg-white hover:border-[#E05C00] hover:text-[#E05C00]">
                      + Doc Verification
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ConfigPanel 
            selectedNode={selectedNode} 
            updateNodeData={updateNodeData} 
            deleteNode={(id: string) => setNodes((nds) => nds.filter((n) => n.id !== id))}
            onClose={() => setSelectedNodeId(null)} 
          />
        </div>

        {/* Simulation Bar */}
        <div 
          className={`absolute bottom-[32px] left-0 right-0 h-[320px] bg-white border-t border-[#E5E7EB] z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex flex-col transition-transform duration-200 ease-out ${
            showSandbox ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-[20px] py-[16px] border-b border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
            <h3 className="text-[14px] font-bold text-[#111827]">Simulation Run — {new Date().toLocaleTimeString()}</h3>
            <button onClick={() => setShowSandbox(false)} className="text-[#6B7280] hover:text-[#111827] text-[18px] font-bold leading-none">
               &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-[20px] py-[16px] bg-white">
            {errors.length > 0 ? (
              <div className="text-[#EF4444] text-[13px] font-medium">
                {errors.map((err, i) => (
                  <div key={i}>Error: {err}</div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {log.map((entry, idx) => (
                  <div key={idx} className="flex gap-[16px] animate-in slide-in-from-bottom-[10px] duration-300 fade-in fill-mode-forwards text-[13px]">
                     <div className="w-[20px] text-center pt-1">
                       {entry.status === 'success' ? <span className="text-[14px]">✅</span> : <span className="text-[14px]">⏳</span>}
                     </div>
                     <div className="flex-1 border-b border-[#E5E7EB] pb-[12px]">
                       <div className="flex items-center justify-between mb-[4px]">
                         <div className="flex items-center gap-[12px]">
                           <span className="font-semibold text-[#6B7280]">Step {entry.step}</span>
                           <span className="px-[8px] py-[2px] rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: TYPE_COLORS[entry.nodeType] || '#CBD5E1' }}>
                             {entry.nodeType}
                           </span>
                           <span className="font-medium text-[#111827]">{entry.label}</span>
                         </div>
                         <div className="text-[12px] text-[#6B7280] font-mono">
                           {entry.duration ? `${entry.duration}ms` : 'pending'}
                         </div>
                       </div>
                       <div className="text-[#6B7280] text-[12px]">{entry.message}</div>
                     </div>
                  </div>
                ))}
              </div>
            )}

            {!isSimulating && log.length > 0 && errors.length === 0 && (
              <div className="mt-[20px]">
                <div className="flex items-center justify-between bg-[#F8F9FA] p-[12px] rounded-[6px] border border-[#E5E7EB]">
                  <div className="text-[12px] font-medium text-[#111827]">
                    <span className="font-bold">{log.length} steps</span> | {log.filter(l => l.status === 'success').length} succeeded | {log.filter(l => l.status === 'pending').length} pending
                  </div>
                  <div className="text-[12px] font-bold text-[#111827]">
                    Total: {log.reduce((acc, curr) => acc + (curr.duration || 0), 0)}ms
                  </div>
                </div>
                <details className="mt-[16px] text-[12px] group">
                  <summary className="cursor-pointer text-[#E05C00] font-medium select-none hover:underline">
                    View Serialized Payload
                  </summary>
                  <pre className="mt-[8px] p-[12px] bg-[#111827] text-[#CBD5E1] rounded-[6px] overflow-x-auto overflow-y-auto max-h-[150px] font-mono text-[11px]">
                    {JSON.stringify({ nodes, edges }, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            
            {isSimulating && log.length === 0 && (
              <div className="text-[13px] text-[#6B7280] italic px-[36px]">Preparing simulation...</div>
            )}
          </div>
        </div>

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
