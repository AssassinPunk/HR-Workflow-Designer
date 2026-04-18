export const MOCK_AUTOMATIONS = [
  { id: "send_email", label: "Send Email", params: ["to", "subject"] },
  { id: "generate_doc", label: "Generate Document", params: ["template", "recipient"] },
  { id: "notify_slack", label: "Notify Slack", params: ["channel", "message"] }
];

export function validateWorkflow(nodes: any[], edges: any[]) {
  const errors: string[] = [];
  const startNodes = nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push("Missing Start Node.");
  } else if (startNodes.length > 1) {
    errors.push("Only one Start Node is allowed.");
  }

  // Check isolated nodes (excluding start nodes which shouldn't have incoming edges)
  nodes.forEach(node => {
    if (node.type !== 'start') {
      const hasIncoming = edges.some(e => e.target === node.id);
      if (!hasIncoming) {
        errors.push(`Node "${node.data.title || node.type}" has no incoming connection.`);
      }
    }
  });

  return errors;
}

export async function simulateWorkflow(nodes: any[], edges: any[]) {
  const log: any[] = [];
  const errors = validateWorkflow(nodes, edges);
  if (errors.length > 0) {
    return { success: false, log: [], errors };
  }

  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) return { success: false, log: [], errors: ["Missing start node"] };

  const visited = new Set<string>();
  const inDegree = new Map<string, number>();
  
  nodes.forEach(n => inDegree.set(n.id, 0));
  edges.forEach(e => {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }
  });

  const queue = nodes.filter(n => inDegree.get(n.id) === 0);
  let step = 1;

  while(queue.length > 0) {
    const node = queue.shift()!;
    visited.add(node.id);

    let msg = "";
    let status: "success" | "pending" | "skipped" = node.type === 'approval' ? 'pending' : 'success';
    
    switch(node.type) {
      case 'start': 
        msg = "Workflow initiated"; 
        break;
      case 'task': 
        msg = `Assigned to ${node.data.assignee || 'Unassigned'} — awaiting completion`; 
        break;
      case 'approval': 
        msg = `Sent to ${node.data.approver_role || 'Manager'} for review — auto-approves if score > ${node.data.auto_approve_threshold || 0}`; 
        break;
      case 'automated': 
        const actionLabel = MOCK_AUTOMATIONS.find(a => a.id === node.data.action)?.label || node.data.action || 'Unknown Action';
        const numParams = Object.keys(node.data.action_params || {}).length;
        msg = `Executing '${actionLabel}' with ${numParams} parameters`; 
        break;
      case 'end': 
        msg = `${node.data.end_message || 'Workflow complete'}`; 
        break;
    }

    log.push({
      step: step++,
      nodeId: node.id,
      nodeType: node.type.toUpperCase(),
      label: node.data.title || node.type.toUpperCase(),
      status: status,
      message: msg,
      duration: status === 'pending' ? null : Math.floor(Math.random() * 320) + 80
    });

    const outgoingEdges = edges.filter(e => e.source === node.id);
    outgoingEdges.forEach((e) => {
      const targetId = e.target;
      inDegree.set(targetId, inDegree.get(targetId)! - 1);
      if (inDegree.get(targetId) === 0) {
        queue.push(nodes.find(n => n.id === targetId));
      }
    });
  }

  if (visited.size < nodes.length) {
    errors.push("Cycle detected or graph is disconnected.");
    return { success: false, log: [], errors };
  }

  return { success: true, log, errors: [] };
}
