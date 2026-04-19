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
  Panel,
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
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSandbox, setShowSandbox] = useState(false);

  // Context Menu & Toast State
  const [contextMenu, setContextMenu] = useState<{ id: string, top: number, left: number } | null>(null);
  const [toast, setToast] = useState<{ id: number, message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toastId = Date.now();
    setToast({ id: toastId, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toastId ? null : prev));
    }, 1500);
  }, []);

  // Undo/Redo State & Refs
  const [history, setHistory] = useState<{nodes: any[], edges: any[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const isRestoring = useRef(false);
  
  const takeSnapshotRef = useRef(false);
  const debounceTargetRef = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const commitSnapshot = useCallback((currentNodes: any[], currentEdges: any[]) => {
    const state = {
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges))
    };
    const prev = historyIndexRef.current >= 0 ? historyRef.current[historyIndexRef.current] : null;
    if (prev && JSON.stringify(prev) === JSON.stringify(state)) return;

    setHistory((prevHist) => {
      const newHist = historyIndexRef.current >= 0 ? prevHist.slice(0, historyIndexRef.current + 1) : [];
      newHist.push(state);
      if (newHist.length > 50) newHist.shift(); // 50 snapshots
      historyIndexRef.current = newHist.length - 1;
      historyRef.current = newHist;
      setHistoryIndex(newHist.length - 1);
      return newHist;
    });
  }, []);

  const requestSnapshot = useCallback((debounced = false) => {
    if (debounced) {
      debounceTargetRef.current = true;
    } else {
      takeSnapshotRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (isRestoring.current) return;

    if (takeSnapshotRef.current) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      takeSnapshotRef.current = false;
      debounceTargetRef.current = false;
      commitSnapshot(nodes, edges);
    } else if (debounceTargetRef.current) {
      debounceTargetRef.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        commitSnapshot(nodesRef.current, edgesRef.current);
      }, 800);
    }
  });

  const [flashUndo, setFlashUndo] = useState(false);
  const [flashRedo, setFlashRedo] = useState(false);

  const triggerButtonFlash = useCallback((type: 'undo' | 'redo') => {
    if (type === 'undo') {
      setFlashUndo(true);
      setTimeout(() => setFlashUndo(false), 200);
    } else {
      setFlashRedo(true);
      setTimeout(() => setFlashRedo(false), 200);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      commitSnapshot(nodesRef.current, edgesRef.current);
      debounceTimer.current = null;
      debounceTargetRef.current = false;
      takeSnapshotRef.current = false;
    }

    if (historyIndexRef.current > 0) {
      const newIdx = historyIndexRef.current - 1;
      const snapshot = historyRef.current[newIdx];
      isRestoring.current = true;
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      triggerButtonFlash('undo');
      setTimeout(() => { isRestoring.current = false; }, 100);
    }
  }, [setNodes, setEdges, commitSnapshot, triggerButtonFlash]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const newIdx = historyIndexRef.current + 1;
      const snapshot = historyRef.current[newIdx];
      isRestoring.current = true;
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      triggerButtonFlash('redo');
      setTimeout(() => { isRestoring.current = false; }, 100);
    }
  }, [setNodes, setEdges, triggerButtonFlash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' && contextMenu) {
        setContextMenu(null);
      } else {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (cmdKey && e.key.toLowerCase() === 'z') {
           if (!isSimulating && !showSandbox) {
             if (e.shiftKey) {
               e.preventDefault();
               handleRedo();
             } else {
               e.preventDefault();
               handleUndo();
             }
           }
        } else if (cmdKey && e.key.toLowerCase() === 'y') {
           if (!isSimulating && !showSandbox) {
              e.preventDefault();
              handleRedo();
           }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, isSimulating, showSandbox, handleUndo, handleRedo]);

  const onNodesChangeApp = useCallback((changes: any) => {
    rfOnNodesChange(changes);
    if (changes.some((c: any) => c.type === 'remove' || (c.type === 'position' && c.dragging === false))) {
      requestSnapshot(false);
    }
  }, [rfOnNodesChange, requestSnapshot]);

  const onEdgesChangeApp = useCallback((changes: any) => {
    rfOnEdgesChange(changes);
    if (changes.some((c: any) => c.type === 'remove' || c.type === 'add')) {
      requestSnapshot(false);
    }
  }, [rfOnEdgesChange, requestSnapshot]);

  const onConnectApp = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => addEdge(params, eds));
      requestSnapshot(false);
    },
    [setEdges, requestSnapshot],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    if (contextMenu) setContextMenu(null);
  }, [contextMenu]);

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
    requestSnapshot(false);
    setTimeout(() => {
        if(reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
        }
    }, 50);
  }, [setNodes, setEdges, reactFlowInstance, requestSnapshot]);

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
      requestSnapshot(false);
    },
    [reactFlowInstance, setNodes, requestSnapshot],
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
    requestSnapshot(true);
  }, [setNodes, requestSnapshot]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length <= 1 || edges.length === 0) {
      if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      showToast("Nothing to layout — add more nodes.", "info");
      return;
    }
    
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });
    
    edges.forEach(e => {
      if (adj.has(e.source)) {
        adj.get(e.source)!.push(e.target);
      }
      if (inDegree.has(e.target)) {
        inDegree.set(e.target, inDegree.get(e.target)! + 1);
      }
    });
    
    const unconnected: string[] = [];
    nodes.forEach(n => {
      if ((inDegree.get(n.id) || 0) === 0 && (adj.get(n.id) || []).length === 0) {
        unconnected.push(n.id);
      }
    });
    
    const depths = new Map<string, number>();
    let queue: string[] = [];
    
    nodes.forEach(n => {
      if (n.type === 'start') {
        queue.push(n.id);
        depths.set(n.id, 0);
      } else if ((inDegree.get(n.id) || 0) === 0 && !unconnected.includes(n.id)) {
        queue.push(n.id);
        depths.set(n.id, 0);
      }
    });
    
    if (queue.length === 0 && nodes.length > unconnected.length) {
      const firstConnected = nodes.find(n => !unconnected.includes(n.id))?.id;
      if (firstConnected) {
        queue.push(firstConnected);
        depths.set(firstConnected, 0);
      }
    }
    
    const maxNodesDepth = nodes.length + 1;
    let q = [...queue];
    while (q.length > 0) {
      const u = q.shift()!;
      const currentDepth = depths.get(u) || 0;
      const neighbors = adj.get(u) || [];
      
      for (const v of neighbors) {
        const targetNode = nodes.find(n => n.id === v);
        if (targetNode?.type === 'start') continue; // Do not push back the start node
        
        const vDepth = depths.get(v) || 0;
        if (currentDepth + 1 > vDepth) {
          depths.set(v, currentDepth + 1);
          if (currentDepth + 1 <= maxNodesDepth) {
            q.push(v);
          }
        }
      }
    }
    
    const columns = new Map<number, string[]>();
    let maxRows = 0;
    nodes.forEach(n => {
      if (!unconnected.includes(n.id)) {
        const d = depths.get(n.id) || 0;
        if (!columns.has(d)) columns.set(d, []);
        columns.get(d)!.push(n.id);
      }
    });
    
    columns.forEach(col => {
      if (col.length > maxRows) maxRows = col.length;
    });
    
    const newNodes = nodes.map(node => {
      let x = 0;
      let y = 0;
      
      if (unconnected.includes(node.id)) {
         const idx = unconnected.indexOf(node.id);
         x = idx * 240 + 80;
         y = (maxRows + 1) * 140 + 80;
      } else {
         const d = depths.get(node.id) || 0;
         const colArray = columns.get(d) || [];
         const rIndex = colArray.indexOf(node.id);
         const colSize = colArray.length;
         
         x = d * 240 + 80;
         const offsetY = ((maxRows - colSize) * 140) / 2;
         y = rIndex * 140 + 80 + offsetY;
      }
      
      return {
         ...node,
         position: { x, y },
         style: { ...node.style, transition: 'transform 0.4s ease-out' }
      };
    });
    
    setNodes(newNodes);
    requestSnapshot(false);
    showToast('✅ Layout applied', 'success');
    
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }
      
      // Remove animation property safely so normal dragging works again
      setTimeout(() => {
        setNodes(nds => nds.map(n => {
          if (n.style && (n.style as any).transition) {
             const { transition, ...restStyle } = n.style as any;
             return { ...n, style: restStyle };
          }
          return n;
        }));
      }, 500);
    }, 50);
    
  }, [nodes, edges, reactFlowInstance, setNodes, requestSnapshot, showToast]);

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
        <header className="h-[56px] border-b border-[#E5E7EB] flex items-center justify-between px-[20px] shrink-0 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] relative z-30">
          <div className="flex items-center gap-[8px] font-bold text-[#E05C00]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> 
            HRFlow Designer
          </div>
          
          <div className="flex items-center gap-[40px]">
            {/* Undo / Redo */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-[8px]">
                <button 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo (Ctrl+Z)"
                  className={`bg-white border px-[12px] py-[6px] text-[12px] rounded-[4px] text-[#111827] transition flex items-center gap-[4px] shadow-sm
                    ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed border-[#E5E7EB]' : 'hover:bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#D1D5DB]'}
                    ${flashUndo ? 'border-[#E05C00] shadow-[0_0_0_1px_#E05C00] z-10' : ''}`}
                >
                  <span className="text-[14px]">↩</span> Undo
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo (Ctrl+Y)"
                  className={`bg-white border px-[12px] py-[6px] text-[12px] rounded-[4px] text-[#111827] transition flex items-center gap-[4px] shadow-sm
                    ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed border-[#E5E7EB]' : 'hover:bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#D1D5DB]'}
                    ${flashRedo ? 'border-[#E05C00] shadow-[0_0_0_1px_#E05C00] z-10' : ''}`}
                >
                  <span className="text-[14px]">↪</span> Redo
                </button>
              </div>
              {history.length > 0 ? (
                <div className="text-[11px] text-[#9CA3AF] mt-[2px] font-mono tracking-tighter w-full text-center select-none">
                  History: {historyIndex + 1}/{history.length}
                </div>
              ) : (
                <div className="text-[11px] text-[#9CA3AF] mt-[2px] font-mono tracking-tighter w-full text-center select-none">
                  History: —
                </div>
              )}
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
          </div>
        </header>

        {/* Main Content Workspace */}
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar nodes={nodes} edges={edges} validationState={validationState} />
          
          <div className="flex-1 relative bg-[#FAFAFA]" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChangeApp}
              onEdgesChange={onEdgesChangeApp}
              onConnect={onConnectApp}
              isValidConnection={isValidConnection}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onSelectionChange={onSelectionChange}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{ style: { stroke: '#CBD5E1', strokeWidth: 2 } }}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
              className="react-flow-wrapper"
            >
              <Background color="#D1D5DB" gap={20} size={1.5} />
              <Controls />
              <Panel position="bottom-left" style={{ marginLeft: 40, marginBottom: 0 }}>
                <button
                  onClick={handleAutoLayout}
                  className="bg-white text-[#E05C00] border border-[#E05C00] rounded-[6px] h-[28px] w-[100px] text-[12px] font-semibold hover:bg-[#fff5f0] transition-colors shadow-sm flex items-center justify-center"
                >
                  ⚡ Auto Layout
                </button>
              </Panel>
              <MiniMap 
                nodeColor={(node) => {
                  const colors = {
                    start: '#22c55e',
                    task: '#3b82f6', 
                    approval: '#a855f7',
                    automated: '#f97316',
                    end: '#ef4444'
                  };
                  return (colors as any)[node.type!] || '#999';
                }}
                maskColor="rgba(0,0,0,0.06)"
                style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, bottom: 48, right: 16 }}
              />
            </ReactFlow>

            {/* Context Menu Overlay */}
            {contextMenu && (
              <div 
                className="fixed z-50 bg-white rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#E5E7EB] w-[180px] overflow-hidden flex flex-col font-sans"
                style={{ top: contextMenu.top, left: contextMenu.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  className="w-full text-left px-[12px] h-[32px] text-[13px] text-[#111827] hover:bg-[#fff5f0] hover:text-[#E05C00] transition-colors flex items-center gap-[8px]"
                  onClick={() => {
                    setSelectedNodeId(contextMenu.id);
                    setContextMenu(null);
                  }}
                >
                  <span className="w-[16px] text-center">✏️</span> Edit Node
                </button>
                <button 
                  className="w-full text-left px-[12px] h-[32px] text-[13px] text-[#111827] hover:bg-[#fff5f0] hover:text-[#E05C00] transition-colors flex items-center gap-[8px]"
                  onClick={() => {
                    const node = nodes.find(n => n.id === contextMenu.id);
                    if (node) {
                      const newNode = {
                        ...node,
                        id: getId(),
                        selected: false,
                        position: { x: node.position.x + 40, y: node.position.y + 40 },
                        data: { ...node.data }
                      };
                      setNodes((nds) => nds.concat(newNode));
                      requestSnapshot(false);
                    }
                    setContextMenu(null);
                  }}
                >
                  <span className="w-[16px] text-center">📋</span> Duplicate Node
                </button>
                <button 
                  className="w-full text-left px-[12px] h-[32px] text-[13px] text-[#111827] hover:bg-[#fff5f0] hover:text-[#E05C00] transition-colors flex items-center gap-[8px]"
                  onClick={() => {
                    navigator.clipboard.writeText(contextMenu.id);
                    showToast('Copied!', 'success');
                    setContextMenu(null);
                  }}
                >
                  <span className="w-[16px] text-center">🔗</span> Copy Node ID
                </button>
                <div className="h-[1px] bg-[#E5E7EB] my-[4px]" />
                <button 
                  className="w-full text-left px-[12px] h-[32px] text-[13px] text-[#EF4444] hover:bg-[#fff5f0] transition-colors flex items-center gap-[8px]"
                  onClick={() => {
                    const nodeEdges = edges.filter(e => e.source === contextMenu.id || e.target === contextMenu.id);
                    if (nodeEdges.length > 2) {
                      if (!window.confirm(`This node has ${nodeEdges.length} connected edges. Are you sure you want to delete it?`)) {
                        setContextMenu(null);
                        return;
                      }
                    }
                    setNodes((nds) => nds.filter(n => n.id !== contextMenu.id));
                    setEdges((eds) => eds.filter(e => e.source !== contextMenu.id && e.target !== contextMenu.id));
                    requestSnapshot(false);
                    if (selectedNodeId === contextMenu.id) {
                       setSelectedNodeId(null);
                    }
                    setContextMenu(null);
                  }}
                >
                  <span className="w-[16px] text-center">🗑️</span> Delete Node
                </button>
              </div>
            )}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center pointer-events-auto bg-white/90 p-8 rounded-2xl backdrop-blur-sm border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="text-[64px] mb-[16px] leading-none">🎯</div>
                  <h2 className="text-[18px] text-[#333] font-bold mb-[8px]">Start building your workflow</h2>
                  <p className="text-[14px] text-[#888] mb-[24px]">Drag any node from the left sidebar to begin</p>
                  <div className="flex gap-[12px] justify-center items-center">
                    <button onClick={() => loadTemplate('onboarding')} className="px-[16px] py-[6px] rounded-full text-[12px] font-medium text-[#E05C00] transition-[background-color,color] duration-150 ease bg-white border-[1.5px] border-[#E05C00] hover:bg-[#E05C00] hover:text-white">
                      + Onboarding Flow
                    </button>
                    <button onClick={() => loadTemplate('leave')} className="px-[16px] py-[6px] rounded-full text-[12px] font-medium text-[#E05C00] transition-[background-color,color] duration-150 ease bg-white border-[1.5px] border-[#E05C00] hover:bg-[#E05C00] hover:text-white">
                      + Leave Approval
                    </button>
                    <button onClick={() => loadTemplate('docs')} className="px-[16px] py-[6px] rounded-full text-[12px] font-medium text-[#E05C00] transition-[background-color,color] duration-150 ease bg-white border-[1.5px] border-[#E05C00] hover:bg-[#E05C00] hover:text-white">
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
          className={`absolute bottom-[32px] left-0 right-0 bg-white border-t border-[#E5E7EB] z-20 flex flex-col transition-all duration-[250ms] ease-out overflow-hidden ${
            showSandbox ? 'h-[320px] opacity-100 pointer-events-auto shadow-[0_-4px_15px_rgba(0,0,0,0.05)]' : 'h-0 opacity-0 pointer-events-none border-t-transparent shadow-none'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-[20px] py-[16px] border-b border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
            <h3 className="text-[14px] font-bold text-[#111827]">
              Simulation Run — {new Date().toLocaleTimeString()}
              {!isSimulating && log.length > 0 && errors.length === 0 && (
                <span className="font-normal text-[#6B7280]">
                  &nbsp;&nbsp;|&nbsp;&nbsp;✅ {log.length} steps&nbsp;&nbsp;|&nbsp;&nbsp;{log.reduce((acc, curr) => acc + (curr.duration || 0), 0)}ms total
                </span>
              )}
            </h3>
            <button onClick={() => setShowSandbox(false)} className="text-[#6B7280] hover:text-[#111827] text-[20px] font-bold leading-none w-[28px] h-[28px] flex items-center justify-center rounded-full hover:bg-[#E5E7EB] transition-colors">
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
        <div className="h-[32px] w-full bg-[#FAFAFA] border-t border-[#E5E7EB] text-[12px] flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center gap-4 text-gray-500">
            <span>Nodes: {nodes.length}</span>
            <span className="text-[#D1D5DB]">|</span>
            <span>Edges: {edges.length}</span>
            <span className="text-[#D1D5DB]">|</span>
            {validationState.totalErrors === 0 ? (
              <span className="text-[#10B981] font-medium whitespace-nowrap">✅ Valid workflow</span>
            ) : (
              <span className="text-[#E05C00] font-medium whitespace-nowrap flex items-center gap-1 group relative cursor-help">
                ⚠️ Invalid workflow
                
                {validationState.globalErrors.length > 0 && (
                  <div className="hidden group-hover:block absolute bottom-full mb-2 left-0 w-max max-w-[300px] bg-gray-800 text-white text-[11px] p-2 rounded shadow-lg whitespace-pre-wrap text-left z-50">
                    {validationState.globalErrors.map((e, idx) => <div key={idx}>• {e}</div>)}
                  </div>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-[48px] left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-[20px] fade-in duration-200">
            <div className={`bg-[#222] text-white px-[16px] py-[10px] text-[13px] rounded-[6px] shadow-lg border-l-[4px]
              ${toast.type === 'success' ? 'border-[#10B981]' : toast.type === 'error' ? 'border-[#EF4444]' : 'border-[#E05C00]'}`}
            >
              {toast.message}
            </div>
          </div>
        )}
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
