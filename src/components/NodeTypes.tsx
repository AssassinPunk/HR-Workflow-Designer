import { Handle, Position } from '@xyflow/react';

const Badge = ({ color }: { color: string }) => (
  <span className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: color }}></span>
);

const BaseNode = ({ type, data, color, customContent, selected }: any) => {
  return (
    <div className={`bg-white border-[1.5px] rounded-[8px] p-[12px] shadow-[0_2px_4px_rgba(0,0,0,0.05)] w-[180px] ${selected ? 'border-[#E05C00]' : 'border-[#E5E7EB]'}`}>
      <div className="flex items-center gap-[6px] text-[11px] uppercase tracking-[0.5px] font-bold mb-[4px] text-[#111827]">
        <Badge color={color} />
        {type}
      </div>
      <div className="text-[13px] font-semibold text-[#111827]">
        {data.title || `Untitled ${type}`}
      </div>
      <div className="text-[11px] text-[#6B7280] mt-[4px]">
        {customContent}
      </div>
      {type !== 'START' && <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-[#CBD5E1] !border-none" />}
      {type !== 'END' && <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-[#CBD5E1] !border-none" />}
    </div>
  );
};

export const StartNode = ({ data, selected }: any) => (
  <BaseNode 
    type="START" 
    data={data} 
    color="#10B981"
    selected={selected}
    customContent={<div>Initiates the workflow</div>}
  />
);

export const TaskNode = ({ data, selected }: any) => (
  <BaseNode 
    type="TASK" 
    data={data} 
    color="#3B82F6"
    selected={selected}
    customContent={
      <>
        {data.assignee && <div>Assignee: {data.assignee}</div>}
        {data.due_date && <div>Due: {data.due_date}</div>}
      </>
    }
  />
);

export const ApprovalNode = ({ data, selected }: any) => (
  <BaseNode 
    type="APPROVAL" 
    data={data} 
    color="#8B5CF6"
    selected={selected}
    customContent={<div>Role: {data.approver_role || 'Manager'}</div>}
  />
);

export const AutomatedNode = ({ data, selected }: any) => (
  <BaseNode 
    type="AUTOMATED" 
    data={data} 
    color="#E05C00"
    selected={selected}
    customContent={<div>Action: {data.action || 'None'}</div>}
  />
);

export const EndNode = ({ data, selected }: any) => (
  <BaseNode 
    type="END" 
    data={data} 
    color="#EF4444"
    selected={selected}
    customContent={<div className="truncate">{data.end_message || 'Ends workflow'}</div>}
  />
);
