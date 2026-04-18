import React, { useState, useEffect } from 'react';
import { MOCK_AUTOMATIONS } from '../api/mockApi';

export const ConfigPanel = ({ selectedNode, updateNodeData, deleteNode }: any) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data || {});
    } else {
      setFormData({});
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <aside className="w-[280px] border-l border-[#E5E7EB] bg-white p-[20px] justify-center flex flex-col text-center text-[#6B7280] hidden lg:flex shrink-0">
        Select a node to configure
      </aside>
    );
  }

  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    updateNodeData(selectedNode.id, updated);
  };

  const renderFields = () => {
    switch (selectedNode.type) {
      case 'start':
        return (
          <>
            <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
          </>
        );
      case 'task':
        return (
          <>
            <Field label="Title *" required value={formData.title} onChange={(v) => handleChange('title', v)} />
            <Field label="Description" type="textarea" value={formData.description} onChange={(v) => handleChange('description', v)} />
            <Field label="Assignee" value={formData.assignee} onChange={(v) => handleChange('assignee', v)} />
            <Field label="Due Date" type="date" value={formData.due_date} onChange={(v) => handleChange('due_date', v)} />
            <div className="flex items-center gap-2 mt-4 text-sm font-medium text-gray-700">
              <input type="checkbox" id="summary" checked={formData.summary || false} onChange={(e) => handleChange('summary', e.target.checked)} className="rounded border-gray-300 text-[#E05C00] focus:ring-[#E05C00]" />
              <label htmlFor="summary">Requires Summary</label>
            </div>
          </>
        );
      case 'approval':
        return (
          <>
            <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
            <div className="mb-[16px]">
              <label className="block text-[11px] font-semibold uppercase text-[#6B7280] mb-[6px]">Approver Role</label>
              <select className="w-full p-[8px] border border-[#E5E7EB] rounded-[4px] text-[13px] text-[#111827] outline-none focus:border-[#E05C00]" value={formData.approver_role || ''} onChange={(e) => handleChange('approver_role', e.target.value)}>
                <option value="">Select Role</option>
                <option value="Manager">Manager</option>
                <option value="HRBP">HRBP</option>
                <option value="Director">Director</option>
              </select>
            </div>
            <Field label="Auto-approve Threshold" type="number" value={formData.auto_approve_threshold} onChange={(v) => handleChange('auto_approve_threshold', v)} />
          </>
        );
      case 'automated':
        const selectedAction = MOCK_AUTOMATIONS.find(a => a.id === formData.action);
        return (
          <>
            <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
            <div className="mb-[16px]">
              <label className="block text-[11px] font-semibold uppercase text-[#6B7280] mb-[6px]">Action</label>
              <select className="w-full p-[8px] border border-[#E5E7EB] rounded-[4px] text-[13px] text-[#111827] outline-none focus:border-[#E05C00]" value={formData.action || ''} onChange={(e) => handleChange('action', e.target.value)}>
                <option value="">Select Action</option>
                {MOCK_AUTOMATIONS.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            {selectedAction && (
              <div className="mt-4 p-3 bg-gray-50 border rounded-md shadow-inner">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Action Params</div>
                {selectedAction.params.map((param) => {
                  const paramVal = (formData.action_params || {})[param] || "";
                  return (
                     <div key={param} className="mb-2">
                       <label className="text-xs text-gray-600 block mb-1">{param}</label>
                       <input 
                         type="text" 
                         value={paramVal}
                         className="w-full border p-1 rounded text-sm outline-none focus:border-[#E05C00]"
                         onChange={(e) => {
                           handleChange('action_params', {
                             ...(formData.action_params || {}),
                             [param]: e.target.value
                           })
                         }} 
                       />
                     </div>
                  )
                })}
              </div>
            )}
          </>
        );
      case 'end':
        return (
          <>
            <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
            <Field label="End Message" type="textarea" value={formData.end_message} onChange={(v) => handleChange('end_message', v)} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-[280px] border-l border-[#E5E7EB] bg-white p-[20px] h-full overflow-y-auto hidden lg:block relative shrink-0">
      <div className="text-[14px] font-bold mb-[20px] text-[#111827]">
        Configure {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
      </div>
      
      <div>
        {renderFields()}
      </div>

      <div className="mt-[20px] pt-[20px] border-t border-[#E5E7EB]">
         <button 
           onClick={() => deleteNode(selectedNode.id)}
           className="w-full bg-white border border-[#EF4444] border-opacity-20 text-[#EF4444] px-[12px] py-[6px] text-[12px] rounded-[4px] hover:bg-red-50 transition"
         >
           Delete Node
         </button>
      </div>
    </aside>
  );
};

const Field = ({ label, value, onChange, type = 'text', required = false }: any) => {
  return (
    <div className="mb-[16px]">
      <label className="block text-[11px] font-semibold uppercase text-[#6B7280] mb-[6px]">
        {label} 
      </label>
      {type === 'textarea' ? (
        <textarea 
          className="w-full p-[8px] border border-[#E5E7EB] rounded-[4px] text-[13px] text-[#111827] outline-none focus:border-[#E05C00]"
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input 
          type={type} 
          className="w-full p-[8px] border border-[#E5E7EB] rounded-[4px] text-[13px] text-[#111827] outline-none focus:border-[#E05C00]"
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
        />
      )}
    </div>
  )
}
