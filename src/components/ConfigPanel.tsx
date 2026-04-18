import React, { useState, useEffect } from 'react';
import { MOCK_AUTOMATIONS } from '../api/mockApi';

const TYPE_COLORS: Record<string, string> = {
  start: '#10B981',
  task: '#3B82F6',
  approval: '#8B5CF6',
  automated: '#E05C00',
  end: '#EF4444'
};

export const ConfigPanel = ({ selectedNode, updateNodeData, deleteNode, onClose }: any) => {
  const [formData, setFormData] = useState<any>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data || {});
    } else {
      setFormData({});
    }
  }, [selectedNode]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (selectedNode) {
      updateNodeData(selectedNode.id, updated);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const renderKV = (fieldKey: string) => {
    const pairs = formData[fieldKey] || [];
    return (
      <div className="mb-[16px]">
        <label className="block text-[11px] font-semibold uppercase text-[#6B7280] mb-[6px]">{fieldKey.replace('_', ' ')}</label>
        {pairs.map((pair: any, index: number) => (
          <div key={index} className="flex items-center gap-[4px] mb-[6px]">
            <input 
              placeholder="Key"
              className="w-1/2 p-[6px] border border-[#E5E7EB] rounded-[4px] text-[12px] text-[#111827] outline-none focus:border-[#E05C00]"
              value={pair.key}
              onChange={(e) => {
                const newPairs = [...pairs];
                newPairs[index].key = e.target.value;
                handleChange(fieldKey, newPairs);
              }}
            />
            <input 
              placeholder="Value"
              className="w-1/2 p-[6px] border border-[#E5E7EB] rounded-[4px] text-[12px] text-[#111827] outline-none focus:border-[#E05C00]"
              value={pair.value}
              onChange={(e) => {
                const newPairs = [...pairs];
                newPairs[index].value = e.target.value;
                handleChange(fieldKey, newPairs);
              }}
            />
            <button 
              onClick={() => {
                const newPairs = pairs.filter((_: any, i: number) => i !== index);
                handleChange(fieldKey, newPairs);
              }}
              className="w-[24px] h-[24px] flex items-center justify-center shrink-0 border border-[#E5E7EB] rounded-[4px] text-[#6B7280] hover:text-[#EF4444] hover:bg-red-50 text-[14px] font-bold"
            >
              -
            </button>
          </div>
        ))}
        <button 
          onClick={() => handleChange(fieldKey, [...pairs, { key: '', value: '' }])}
          className="text-[#E05C00] text-[12px] font-semibold flex items-center gap-[4px] mt-[4px]"
        >
          + Add Field
        </button>
      </div>
    );
  };

  const renderFields = () => {
    if (!selectedNode) return null;
    switch (selectedNode.type) {
      case 'start':
        return (
          <>
            <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
            {renderKV('metadata')}
          </>
        );
      case 'task':
        return (
          <>
            <Field label="Title" required value={formData.title} onChange={(v) => handleChange('title', v)} />
            <Field label="Description" type="textarea" value={formData.description} onChange={(v) => handleChange('description', v)} />
            <Field label="Assignee" value={formData.assignee} onChange={(v) => handleChange('assignee', v)} />
            <Field label="Due Date" type="date" value={formData.due_date} onChange={(v) => handleChange('due_date', v)} />
            {renderKV('custom_fields')}
            <div className="flex items-center gap-[8px] mb-[16px]">
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input 
                    type="checkbox" 
                    id="summaryToggle" 
                    className="toggle-checkbox absolute block w-[20px] h-[20px] rounded-full bg-white border-4 appearance-none cursor-pointer border-[#E5E7EB] z-10 transition-all duration-200"
                    checked={formData.summary || false} 
                    onChange={(e) => handleChange('summary', e.target.checked)}
                  />
                  <label htmlFor="summaryToggle" className="toggle-label block overflow-hidden h-[20px] rounded-full bg-[#E5E7EB] cursor-pointer transition-colors duration-200"></label>
              </div>
              <label htmlFor="summaryToggle" className="text-[12px] font-semibold text-[#111827]">Requires Summary</label>
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
              <div className="mt-[16px] p-[12px] bg-[#F8F9FA] border border-[#E5E7EB] rounded-[6px]">
                <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-[8px]">Action Params</div>
                {selectedAction.params.map((param) => {
                  const paramVal = (formData.action_params || {})[param] || "";
                  return (
                     <div key={param} className="mb-[8px] last:mb-0">
                       <label className="text-[11px] text-[#6B7280] block mb-[4px]">{param}</label>
                       <input 
                         type="text" 
                         value={paramVal}
                         className="w-full p-[6px] border border-[#E5E7EB] rounded-[4px] text-[12px] text-[#111827] outline-none focus:border-[#E05C00]"
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
    <aside 
      className={`right-0 h-full bg-white border-l border-[#E5E7EB] z-10 flex flex-col w-[280px] shrink-0
        transition-all duration-200 ease-out absolute lg:relative shadow-[-4px_0_15px_rgba(0,0,0,0.05)] lg:shadow-none
        ${selectedNode ? 'translate-x-0' : 'translate-x-[280px] lg:translate-x-0'}`}
    >
      {selectedNode ? (
        <div className="flex flex-col h-full opacity-100 transition-opacity duration-200 delay-100">
          {/* Header */}
          <div className="flex items-center justify-between p-[20px] border-b border-[#E5E7EB] shrink-0">
            <div className="flex items-center gap-[8px]">
              <span className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: TYPE_COLORS[selectedNode.type] || '#CBD5E1' }}></span>
              <span className="text-[14px] font-bold text-[#111827]">
                {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
              </span>
            </div>
            <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] flex items-center justify-center w-[24px] h-[24px] text-[16px] font-bold">
              &times;
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-[20px] overflow-y-auto flex-1">
            {renderFields()}
          </div>

          {/* Footer */}
          <div className="p-[20px] border-t border-[#E5E7EB] shrink-0 bg-white">
            <button 
              onClick={handleSave}
              className={`w-full py-[10px] text-[13px] rounded-[6px] font-semibold transition-colors duration-200 ${
                isSaved 
                  ? 'bg-[#10B981] text-white border-transparent' 
                  : 'bg-[#E05C00] text-white hover:bg-[#c95200] border-transparent'
              }`}
            >
              {isSaved ? 'Saved \u2713' : 'Save Configuration'}
            </button>
            <button 
              onClick={() => {
                deleteNode(selectedNode.id);
                onClose();
              }}
              className="w-full mt-[12px] bg-white border border-[#E5E7EB] text-[#EF4444] py-[8px] text-[12px] rounded-[6px] hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              Delete Node
            </button>
          </div>
        </div>
      ) : (
        <div className="p-[20px] text-center text-[#6B7280] text-[13px] flex-1 flex items-center justify-center opacity-100 transition-opacity duration-200 delay-100 hidden lg:flex">
          No node selected
        </div>
      )}
    </aside>
  );
};

const Field = ({ label, value, onChange, type = 'text', required = false }: any) => {
  return (
    <div className="mb-[16px]">
      <label className="block text-[11px] font-semibold uppercase text-[#6B7280] mb-[6px]">
        {label} {required && <span className="text-[#EF4444]">*</span>}
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
