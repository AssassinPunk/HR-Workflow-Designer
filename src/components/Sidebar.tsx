import React, { useState, useEffect } from 'react';

const NODE_TYPES = [
  { type: 'start', label: 'Start Node', color: 'bg-[#10B981]' },
  { type: 'task', label: 'Task Node', color: 'bg-[#3B82F6]' },
  { type: 'approval', label: 'Approval Node', color: 'bg-[#8B5CF6]' },
  { type: 'automated', label: 'Automated Step', color: 'bg-[#E05C00]' },
  { type: 'end', label: 'End Node', color: 'bg-[#EF4444]' },
];

const TIPS = [
  "Press Delete or Backspace to remove selected node/edge.",
  "A workflow must have exactly one Start Node.",
  "No isolated nodes or cycles are allowed.",
  "Double-click a connection line to delete it quickly.",
  "Hover over a red ⚠️ badge to see validation issues."
];

const bgToHex = (bgClass: string) => {
  if (bgClass.includes('#10B981')) return '#10B981';
  if (bgClass.includes('#3B82F6')) return '#3B82F6';
  if (bgClass.includes('#8B5CF6')) return '#8B5CF6';
  if (bgClass.includes('#E05C00')) return '#E05C00';
  if (bgClass.includes('#EF4444')) return '#EF4444';
  return '#eee';
};

export const Sidebar = ({ nodes = [], edges = [], validationState = { totalErrors: 0 } }: any) => {
  const [activeTip, setActiveTip] = useState(0);
  const [fade, setFade] = useState(true);
  const [draggingType, setDraggingType] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveTip((t) => (t + 1) % TIPS.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, colorClass: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';

    const hexColor = bgToHex(colorClass);
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.width = '180px';
    ghost.style.opacity = '0.9';
    ghost.className = 'bg-white border-[1.5px] border-[#E5E7EB] rounded-[8px] p-[12px] shadow-sm font-sans';
    ghost.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:bold;margin-bottom:4px;color:#111827;">
         <span style="width:8px;height:8px;border-radius:9999px;background-color:${hexColor}"></span>
         ${nodeType}
      </div>
      <div style="font-size:13px;font-weight:600;color:#111827;">Untitled ${nodeType}</div>
    `;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 90, 20);

    setTimeout(() => {
      document.body.removeChild(ghost);
      setDraggingType(nodeType);
    }, 0);
  };

  const onDragEnd = () => {
    setDraggingType(null);
  };

  return (
    <aside className="w-[220px] border-r border-[#E5E7EB] bg-white p-[20px] pb-[16px] flex flex-col gap-[16px] h-full shrink-0">
      <div className="flex-1 overflow-y-auto min-h-0 pr-[4px]">
        <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-[10px] tracking-wider">Add Nodes</div>
        <div className="flex flex-col gap-[10px]">
          {NODE_TYPES.map((node) => {
            const count = nodes.filter((n: any) => n.type === node.type).length;
            const isInvalidStart = node.type === 'start' && count > 1;
            const badgeStyle = isInvalidStart 
              ? { background: '#EF4444', color: '#FFF' }
              : { background: '#f0f0f0', color: count === 0 ? '#aaa' : '#555' };

            const isDragging = draggingType === node.type;

            return (
              <div
                key={node.type}
                className={`p-[10px] border border-[#E5E7EB] rounded-[6px] cursor-grab bg-white flex items-center justify-between hover:border-[#D1D5DB] transition-all hover:shadow-sm ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                onDragStart={(event) => onDragStart(event, node.type, node.color)}
                onDragEnd={onDragEnd}
                draggable
              >
                <div className="flex items-center gap-[8px] text-[13px] font-medium text-[#111827]">
                  <div className={`w-[8px] h-[8px] rounded-full ${node.color}`}></div>
                  <span>{node.label}</span>
                </div>
                <div 
                  style={{
                    ...badgeStyle,
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="shrink-0 mt-auto flex flex-col gap-[16px]">
        <div className="text-[#6B7280] border-t border-[#E5E7EB] pt-[16px]">
          <div className="text-[11px] font-bold tracking-wider uppercase mb-[8px] text-[#4B5563]">Canvas Summary</div>
          <div className="flex flex-col gap-[4px] text-[12px]">
            <div className="flex justify-between items-center">
              <span>Total Nodes:</span>
              <span className="font-mono bg-[#F3F4F6] px-[6px] rounded-[4px]">{nodes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Edges:</span>
              <span className="font-mono bg-[#F3F4F6] px-[6px] rounded-[4px]">{edges.length}</span>
            </div>
            <div className="flex justify-between items-center mt-[2px]">
              <span>Workflow:</span>
              {validationState.totalErrors === 0 ? (
                <span className="text-[#10B981] font-semibold flex items-center gap-[4px]">
                  ✅ Valid
                </span>
              ) : (
                <span className="text-[#EF4444] font-semibold flex items-center gap-[4px]">
                  ⚠️ Invalid
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-[12px] text-[#6B7280] leading-relaxed border-t border-[#E5E7EB] pt-[16px] h-[80px] relative">
          <p className="font-semibold mb-[4px] text-[#4B5563]">💡 Tip:</p>
          <p className={`transition-opacity duration-300 italic ${fade ? 'opacity-100' : 'opacity-0'}`}>
            {TIPS[activeTip]}
          </p>
        </div>
      </div>
    </aside>
  );
};
