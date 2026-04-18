import { Handle, Position } from '@xyflow/react';
import React, { useContext } from 'react';
import { ValidationContext } from '../App';

const Badge = ({ color }: { color: string }) => (
  <span className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: color }}></span>
);

const BaseNode = ({ id, type, data, color, customContent, selected }: any) => {
  const { nodeErrors } = useContext(ValidationContext);
  const errors = nodeErrors[id] || [];

  return (
    <div className={`bg-white border-[1.5px] rounded-[8px] p-[12px] shadow-[0_2px_4px_rgba(0,0,0,0.05)] w-[180px] relative ${selected ? 'border-[#E05C00]' : 'border-[#E5E7EB]'}`}>
      
      {errors.length > 0 && (
        <div className="absolute -top-[6px] -right-[6px] w-[18px] h-[18px] bg-[#EF4444] rounded-full flex items-center justify-center shadow-sm z-50 group cursor-help transition-all">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div className="hidden group-hover:block absolute bottom-full mb-1 right-0 w-max max-w-[200px] bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg whitespace-pre-wrap text-left normal-case tracking-normal font-normal z-[60]">
            {errors.map((e: string, idx: number) => <div key={idx}>• {e}</div>)}
          </div>
        </div>
      )}

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

export const StartNode = ({ id, data, selected }: any) => (
  <BaseNode id={id} type="START" data={data} color="#10B981" selected={selected} customContent={<div>Initiates the workflow</div>} />
);

export const TaskNode = ({ id, data, selected }: any) => (
  <BaseNode id={id} type="TASK" data={data} color="#3B82F6" selected={selected} customContent={<>{data.assignee && <div>Assignee: {data.assignee}</div>}{data.due_date && <div>Due: {data.due_date}</div>}</>} />
);

export const ApprovalNode = ({ id, data, selected }: any) => (
  <BaseNode id={id} type="APPROVAL" data={data} color="#8B5CF6" selected={selected} customContent={<div>Role: {data.approver_role || 'Manager'}</div>} />
);

export const AutomatedNode = ({ id, data, selected }: any) => (
  <BaseNode id={id} type="AUTOMATED" data={data} color="#E05C00" selected={selected} customContent={<div>Action: {data.action || 'None'}</div>} />
);

export const EndNode = ({ id, data, selected }: any) => (
  <BaseNode id={id} type="END" data={data} color="#EF4444" selected={selected} customContent={<div className="truncate">{data.end_message || 'Ends workflow'}</div>} />
);
