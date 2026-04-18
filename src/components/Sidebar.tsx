import React from 'react';

const NODE_TYPES = [
  { type: 'start', label: 'Start Node', color: 'bg-[#10B981]' },
  { type: 'task', label: 'Task Node', color: 'bg-[#3B82F6]' },
  { type: 'approval', label: 'Approval Node', color: 'bg-[#8B5CF6]' },
  { type: 'automated', label: 'Automated Step', color: 'bg-[#E05C00]' },
  { type: 'end', label: 'End Node', color: 'bg-[#EF4444]' },
];

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-[200px] border-r border-[#E5E7EB] bg-white p-[20px] flex flex-col gap-[16px] h-full overflow-y-auto hidden sm:flex shrink-0">
      <div>
        <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-[6px]">Add Nodes</div>
        <div className="flex flex-col gap-[10px] mt-[10px]">
          {NODE_TYPES.map((node) => (
            <div
              key={node.type}
              className="p-[10px] border border-[#E5E7EB] rounded-[6px] cursor-grab bg-white text-[13px] font-medium flex items-center gap-[8px] hover:border-[#D1D5DB] text-[#111827]"
              onDragStart={(event) => onDragStart(event, node.type)}
              draggable
            >
              <div className={`w-[8px] h-[8px] rounded-full ${node.color}`}></div>
              <span>{node.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 text-[11px] text-[#6B7280] leading-relaxed border-t border-[#E5E7EB] pt-4">
        <p className="font-semibold mb-1">Tips:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Press <strong>Delete</strong> or <strong>Backspace</strong> to remove selected node/edge.</li>
          <li>A workflow must have exactly one Start Node.</li>
          <li>No isolated nodes or cycles are allowed.</li>
        </ul>
      </div>
    </aside>
  );
};
