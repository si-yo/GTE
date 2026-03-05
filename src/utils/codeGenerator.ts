import { Graph, GraphNode, Connection } from '../types/nodes';

// ============================================
// CONNECTION ANALYSIS
// ============================================

interface ConnectionAnalysis {
  incoming: Map<string, Connection[]>;
  outgoing: Map<string, Connection[]>;
  portToConnection: Map<string, Connection>;
}

function analyzeConnections(graph: Graph): ConnectionAnalysis {
  const incoming = new Map<string, Connection[]>();
  const outgoing = new Map<string, Connection[]>();
  const portToConnection = new Map<string, Connection>();
  
  for (const conn of graph.connections) {
    
    if (!incoming.has(conn.toNode)) incoming.set(conn.toNode, []);
    incoming.get(conn.toNode)!.push(conn);
    
    if (!outgoing.has(conn.fromNode)) outgoing.set(conn.fromNode, []);
    outgoing.get(conn.fromNode)!.push(conn);
    
    // Map the target port to its connection
    portToConnection.set(conn.toPort, conn);
  }

  return { incoming, outgoing, portToConnection };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getPortIndex(portId: string): number {
  const match = portId.match(/_(?:in|out)_(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

// ============================================
// VALUE TRACING - Follow connections to get expressions
// ============================================

function traceInputValue(
  node: GraphNode,
  inputIndex: number,
  nodeMap: Map<string, GraphNode>,
  analysis: ConnectionAnalysis,
  stateNodes: Map<string, GraphNode>,
  stateToInputs: Map<string, { inputNodeId: string; stateName: string; setterName: string }[]>,
  visited: Set<string> = new Set()
): string | null {
  const portId = `${node.id}_in_${inputIndex}`;
  const conn = analysis.portToConnection.get(portId);
  
  if (!conn) {
    // Try to find connection by iterating through incoming connections
    const incomingConns = analysis.incoming.get(node.id) || [];
    
    for (const c of incomingConns) {
      const toPortIndex = getPortIndex(c.toPort);
      if (toPortIndex === inputIndex) {
        const sourceNode = nodeMap.get(c.fromNode);
        if (sourceNode) {
          const sourcePortIndex = getPortIndex(c.fromPort);
          return getNodeExpression(sourceNode, sourcePortIndex, nodeMap, analysis, stateNodes, stateToInputs, visited);
        }
      }
    }
    return null;
  }
  
  const sourceNode = nodeMap.get(conn.fromNode);
  if (!sourceNode) return null;
  
  const sourcePortIndex = getPortIndex(conn.fromPort);
  return getNodeExpression(sourceNode, sourcePortIndex, nodeMap, analysis, stateNodes, stateToInputs, visited);
}

function getNodeExpression(
  node: GraphNode,
  outputIndex: number,
  nodeMap: Map<string, GraphNode>,
  analysis: ConnectionAnalysis,
  stateNodes: Map<string, GraphNode>,
  stateToInputs: Map<string, { inputNodeId: string; stateName: string; setterName: string }[]>,
  visited: Set<string> = new Set()
): string {
  const visitKey = `${node.id}_${outputIndex}`;
  if (visited.has(visitKey)) return 'null';
  visited.add(visitKey);
  
  const trace = (n: GraphNode, idx: number) => 
    traceInputValue(n, idx, nodeMap, analysis, stateNodes, stateToInputs, new Set(visited));
  
  // Check if it's a UI node requesting its element (usually implicit or specific port)
  // For standard data nodes, outputIndex matters. For UI nodes being embedded, we return JSX.
  if (node.type.startsWith('ui-')) {
    // If outputIndex corresponds to 'element' output (usually last or specific)
    const elementOutput = node.outputs.find(o => o.name === 'element');
    const elementIndex = elementOutput ? getPortIndex(elementOutput.id) : -1;
    
    if (outputIndex === elementIndex) {
      return generateNodeJSX(node, nodeMap, analysis, stateNodes, stateToInputs);
    }
  }

  switch (node.type) {
    // Data nodes
    case 'data-string': {
      const val = node.properties.value ?? '';
      return JSON.stringify(val);
    }
    case 'data-number':
      return String(node.properties.value ?? 0);
    case 'data-boolean':
      return String(node.properties.value ?? false);
    case 'data-array': {
      const items: string[] = [];
      // Assuming max 5 inputs for array node or dynamic
      // The node definition has 3 inputs by default but let's check connections
      const incoming = analysis.incoming.get(node.id) || [];
      // Sort incoming by port index
      incoming.sort((a, b) => getPortIndex(a.toPort) - getPortIndex(b.toPort));
      
      // Also check if we have inputs defined in the node
      for (let i = 0; i < node.inputs.length; i++) {
        const item = trace(node, i);
        if (item && item !== 'null') items.push(item);
      }
      return items.length > 0 ? `[${items.join(', ')}]` : '[]';
    }
    case 'data-object':
      return '{}';
    case 'data-concat': {
      const a = trace(node, 0) || '""';
      const b = trace(node, 1) || '""';
      return `(String(${a}) + String(${b}))`;
    }
    case 'data-get': {
      const obj = trace(node, 0) || '{}';
      const key = node.properties.key || 'key';
      return `(${obj})?.${key}`;
    }
    
    // Hook nodes
    case 'hook-useState': {
      const name = node.properties.name || 'state';
      return outputIndex === 0 ? name : `set${toPascalCase(name)}`;
    }
    case 'hook-useRef': {
      const name = node.properties.name || 'ref';
      return outputIndex === 0 ? name : `${name}.current`;
    }
    case 'hook-useMemo': {
      return node.properties.name || 'memoized';
    }
    
    // Math nodes
    case 'math-add': {
      const a = trace(node, 0) || '0';
      const b = trace(node, 1) || '0';
      return `(Number(${a}) + Number(${b}))`;
    }
    case 'math-subtract': {
      const a = trace(node, 0) || '0';
      const b = trace(node, 1) || '0';
      return `(Number(${a}) - Number(${b}))`;
    }
    case 'math-multiply': {
      const a = trace(node, 0) || '0';
      const b = trace(node, 1) || '0';
      return `(Number(${a}) * Number(${b}))`;
    }
    case 'math-divide': {
      const a = trace(node, 0) || '0';
      const b = trace(node, 1) || '1';
      return `(Number(${a}) / Number(${b}))`;
    }
    
    // Logic nodes
    case 'logic-compare': {
      const a = trace(node, 0) || 'null';
      const b = trace(node, 1) || 'null';
      const op = node.properties.operator || '===';
      return `(${a} ${op} ${b})`;
    }
    case 'logic-and': {
      const a = trace(node, 0) || 'false';
      const b = trace(node, 1) || 'false';
      return `(${a} && ${b})`;
    }
    case 'logic-or': {
      const a = trace(node, 0) || 'false';
      const b = trace(node, 1) || 'false';
      return `(${a} || ${b})`;
    }
    case 'logic-not': {
      const input = trace(node, 0) || 'false';
      return `(!${input})`;
    }
    case 'logic-loop': {
      if (outputIndex === 1) return 'item';
      if (outputIndex === 2) return 'index';
      return 'null';
    }
    
    // UI nodes - output their value if they have one
    case 'ui-input': {
      // Output port 1 is the value
      if (outputIndex === 1) {
        // Find if this input is connected to a state
        const incoming = analysis.incoming.get(node.id) || [];
        for (const conn of incoming) {
          if (getPortIndex(conn.toPort) === 2) { // value input
            const sourceNode = nodeMap.get(conn.fromNode);
            if (sourceNode?.type === 'hook-useState') {
              return sourceNode.properties.name || 'state';
            }
          }
        }
        return 'inputValue';
      }
      return 'null';
    }
    
    // Async
    case 'async-fetch': {
      if (outputIndex === 2) return 'data';
      if (outputIndex === 3) return 'error';
      if (outputIndex === 4) return 'loading';
      return 'null';
    }
    
    default:
      return 'null';
  }
}

// ============================================
// FIND FLOW TARGET - What happens when a button is clicked
// ============================================

interface FlowAction {
  type: 'log' | 'setState' | 'fetch' | 'delay' | 'none';
  code: string;
}

function findFlowAction(
  startNode: GraphNode,
  outputPortIndex: number,
  nodeMap: Map<string, GraphNode>,
  analysis: ConnectionAnalysis,
  stateNodes: Map<string, GraphNode>,
  stateToInputs: Map<string, { inputNodeId: string; stateName: string; setterName: string }[]>,
  visited: Set<string> = new Set()
): FlowAction {
  const portId = `${startNode.id}_out_${outputPortIndex}`;
  
  // Find connections from this output port
  const connections = analysis.outgoing.get(startNode.id) || [];
  
  for (const conn of connections) {
    if (conn.fromPort !== portId) continue;
    
    const targetNode = nodeMap.get(conn.toNode);
    if (!targetNode || visited.has(targetNode.id)) continue;
    
    visited.add(targetNode.id);
    
    // Debug log
    if (targetNode.type === 'debug-log') {
      const msgInput = traceInputValue(targetNode, 1, nodeMap, analysis, stateNodes, stateToInputs);
      const msg = msgInput || '"Button clicked!"';
      return { type: 'log', code: `console.log(${msg})` };
    }
    
    // Math operation -> need to find where the result goes
    if (targetNode.type.startsWith('math-')) {
      const mathExpr = getNodeExpression(targetNode, 0, nodeMap, analysis, stateNodes, stateToInputs);
      
      // Find what state this math result should update
      // Look at outgoing connections from the math node
      const mathOutgoing = analysis.outgoing.get(targetNode.id) || [];
      for (const mathConn of mathOutgoing) {
        const mathTarget = nodeMap.get(mathConn.toNode);
        if (mathTarget?.type === 'hook-useState') {
          const setterName = `set${toPascalCase(mathTarget.properties.name || 'state')}`;
          return { type: 'setState', code: `${setterName}(${mathExpr})` };
        }
      }
      
      // Check if the math node uses a state value - if so, update that state
      const mathInputs = analysis.incoming.get(targetNode.id) || [];
      for (const mathInput of mathInputs) {
        const sourceNode = nodeMap.get(mathInput.fromNode);
        if (sourceNode?.type === 'hook-useState') {
          const stateName = sourceNode.properties.name || 'state';
          const setterName = `set${toPascalCase(stateName)}`;
          return { type: 'setState', code: `${setterName}(${mathExpr})` };
        }
      }
    }
    
    // Direct setState
    if (targetNode.type === 'hook-useState') {
      const stateName = targetNode.properties.name || 'state';
      const setterName = `set${toPascalCase(stateName)}`;
      // Check if there's a value connected to this
      const valueInput = traceInputValue(targetNode, 0, nodeMap, analysis, stateNodes, stateToInputs);
      if (valueInput) {
        return { type: 'setState', code: `${setterName}(${valueInput})` };
      }
      // Toggle for boolean
      return { type: 'setState', code: `${setterName}(prev => !prev)` };
    }
    
    // Async delay
    if (targetNode.type === 'async-delay') {
      const duration = targetNode.properties.duration || 1000;
      const nextAction = findFlowAction(targetNode, 0, nodeMap, analysis, stateNodes, stateToInputs, visited);
      if (nextAction.type !== 'none') {
        return { type: 'delay', code: `setTimeout(() => { ${nextAction.code}; }, ${duration})` };
      }
    }
    
    // Async fetch
    if (targetNode.type === 'async-fetch') {
      return { type: 'fetch', code: 'fetchData()' };
    }
  }
  
  // SPECIAL CASE: Button with label containing +/- and connected to a state
  // This handles counter patterns where button label indicates the operation
  if (startNode.type === 'ui-button') {
    const labelInput = traceInputValue(startNode, 1, nodeMap, analysis, stateNodes, stateToInputs);
    if (labelInput) {
      const label = labelInput.replace(/"/g, '');
      
      // Find any state nodes in the graph
      for (const [, stateNode] of stateNodes) {
        const stateName = stateNode.properties.name || 'state';
        const setterName = `set${toPascalCase(stateName)}`;
        
        // Check if there are math operations connected to this state
        const stateOutgoing = analysis.outgoing.get(stateNode.id) || [];
        for (const conn of stateOutgoing) {
          const mathNode = nodeMap.get(conn.toNode);
          if (mathNode?.type === 'math-add' && label === '+') {
            const mathExpr = getNodeExpression(mathNode, 0, nodeMap, analysis, stateNodes, stateToInputs);
            return { type: 'setState', code: `${setterName}(${mathExpr})` };
          }
          if (mathNode?.type === 'math-subtract' && label === '-') {
            const mathExpr = getNodeExpression(mathNode, 0, nodeMap, analysis, stateNodes, stateToInputs);
            return { type: 'setState', code: `${setterName}(${mathExpr})` };
          }
        }
      }
    }
  }
  
  return { type: 'none', code: '' };
}

// ============================================
// MAIN CODE GENERATOR
// ============================================

export function generateReactCode(graphs: Graph[]): string {
  let code = `// Generated by React Blueprint - No-Code Editor
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

`;

  for (const graph of graphs) {
    code += generateComponent(graph);
    code += '\n\n';
  }

  const mainGraph = graphs.find(g => g.id === 'main') || graphs[0];
  if (mainGraph) {
    code += `export default ${toPascalCase(mainGraph.name)};\n`;
  }

  return code;
}

function generateComponent(graph: Graph): string {
  const componentName = toPascalCase(graph.name);
  const analysis = analyzeConnections(graph);
  const nodeMap = new Map<string, GraphNode>();
  const stateNodes = new Map<string, GraphNode>();
  
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
    if (node.type === 'hook-useState') {
      stateNodes.set(node.id, node);
    }
  }
  
  // Collect hooks
  const hooks: string[] = [];
  const effects: string[] = [];
  const callbacks: string[] = [];
  
  // Track state -> input bindings for controlled inputs
  const stateToInputs = new Map<string, { inputNodeId: string; stateName: string; setterName: string }[]>();
  
  // Process useState nodes
  for (const node of graph.nodes) {
    if (node.type === 'hook-useState') {
      const name = node.properties.name || 'state';
      const setterName = `set${toPascalCase(name)}`;
      
      let initialValue = traceInputValue(node, 0, nodeMap, analysis, stateNodes, stateToInputs);
      if (!initialValue) {
        const propValue = node.properties.initialValue;
        if (propValue !== undefined) {
          initialValue = typeof propValue === 'string' ? `"${propValue}"` : String(propValue);
        } else {
          initialValue = '""';
        }
      }
      
      hooks.push(`const [${name}, ${setterName}] = useState<any>(${initialValue});`);
      
      // Find which inputs this state is connected to (for controlled inputs)
      const outgoing = analysis.outgoing.get(node.id) || [];
      for (const conn of outgoing) {
        const targetNode = nodeMap.get(conn.toNode);
        if (targetNode?.type === 'ui-input') {
          const targetPort = getPortIndex(conn.toPort);
          if (targetPort === 2) { // value input
            if (!stateToInputs.has(targetNode.id)) {
              stateToInputs.set(targetNode.id, []);
            }
            stateToInputs.get(targetNode.id)!.push({
              inputNodeId: targetNode.id,
              stateName: name,
              setterName
            });
          }
        }
      }
    }
    
    if (node.type === 'hook-useRef') {
      const name = node.properties.name || 'ref';
      let initialValue = traceInputValue(node, 0, nodeMap, analysis, stateNodes, stateToInputs);
      if (!initialValue) {
        initialValue = 'null';
      }
      hooks.push(`const ${name} = useRef<any>(${initialValue});`);
    }
    
    if (node.type === 'hook-useMemo') {
      const name = node.properties.name || 'memoized';
      const computation = traceInputValue(node, 0, nodeMap, analysis, stateNodes, stateToInputs) || 'null';
      
      // Get dependencies
      const deps: string[] = [];
      const incoming = analysis.incoming.get(node.id) || [];
      for (const conn of incoming) {
        const sourceNode = nodeMap.get(conn.fromNode);
        if (sourceNode?.type === 'hook-useState') {
          deps.push(sourceNode.properties.name || 'state');
        }
      }
      
      hooks.push(`const ${name} = useMemo(() => ${computation}, [${deps.join(', ')}]);`);
    }
    
    if (node.type === 'hook-useEffect') {
      let onMountCode = '// Effect logic';
      let cleanupCode = '';
      
      const outgoing = analysis.outgoing.get(node.id) || [];
      for (const conn of outgoing) {
        const portIndex = getPortIndex(conn.fromPort);
        const targetNode = nodeMap.get(conn.toNode);
        
        if (targetNode?.type === 'debug-log') {
          const msg = traceInputValue(targetNode, 1, nodeMap, analysis, stateNodes, stateToInputs) || '"Effect"';
          if (portIndex === 0) {
            onMountCode = `console.log(${msg});`;
          } else if (portIndex === 2) {
            cleanupCode = `console.log(${msg});`;
          }
        }
      }
      
      const deps: string[] = [];
      const incoming = analysis.incoming.get(node.id) || [];
      for (const conn of incoming) {
        const sourceNode = nodeMap.get(conn.fromNode);
        if (sourceNode?.type === 'hook-useState') {
          deps.push(sourceNode.properties.name || 'state');
        }
      }
      
      effects.push(`useEffect(() => {
    ${onMountCode}${cleanupCode ? `\n    return () => {\n      ${cleanupCode}\n    };` : ''}
  }, [${deps.join(', ')}]);`);
    }
    
    if (node.type === 'async-fetch') {
      const url = node.properties.url || '/api/data';
      const method = node.properties.method || 'GET';
      
      let setDataCall = '// Handle data';
      const outgoing = analysis.outgoing.get(node.id) || [];
      for (const conn of outgoing) {
        const targetNode = nodeMap.get(conn.toNode);
        if (targetNode?.type === 'hook-useState') {
          const stateName = targetNode.properties.name || 'data';
          setDataCall = `set${toPascalCase(stateName)}(data);`;
          break;
        }
      }
      
      callbacks.push(`const fetchData = useCallback(async () => {
    try {
      const response = await fetch('${url}', { method: '${method}' });
      const data = await response.json();
      ${setDataCall}
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, []);`);
    }
  }
  
  // Generate JSX
  const jsxLines: string[] = [];
  const uiNodes = graph.nodes
    .filter(n => n.type.startsWith('ui-'))
    .sort((a, b) => a.y - b.y);
  
  // Find root nodes (nodes that are NOT inputs to other UI nodes or Arrays)
  const rootNodes = uiNodes.filter(node => {
    // Check if 'element' output (usually last or specific index) is connected
    const elementOutput = node.outputs.find(o => o.name === 'element');
    if (!elementOutput) return true; // No element output = root
    
    const elementPortIndex = getPortIndex(elementOutput.id);
    const outgoing = analysis.outgoing.get(node.id) || [];
    
    const isConnectedToParent = outgoing.some(conn => {
      // Must be connected from the 'element' port
      if (getPortIndex(conn.fromPort) !== elementPortIndex) return false;
      
      const targetNode = nodeMap.get(conn.toNode);
      if (!targetNode) return false;
      
      // Connected to another UI node (Container, etc.) or Data Array
      return targetNode.type.startsWith('ui-') || targetNode.type === 'data-array';
    });
    
    return !isConnectedToParent;
  });

  for (const node of rootNodes) {
    const jsx = generateNodeJSX(node, nodeMap, analysis, stateNodes, stateToInputs);
    if (jsx) jsxLines.push(jsx);
  }
  
  return `// Component: ${graph.name}
const ${componentName}: React.FC = () => {
${hooks.map(h => `  ${h}`).join('\n')}

${effects.map(e => `  ${e}`).join('\n')}

${callbacks.map(c => `  ${c}`).join('\n')}

  return (
    <div className="p-4 space-y-4">
${jsxLines.length > 0 ? jsxLines.join('\n') : '      <p>Empty component</p>'}
    </div>
  );
};`;
}

function generateNodeJSX(
  node: GraphNode,
  nodeMap: Map<string, GraphNode>,
  analysis: ConnectionAnalysis,
  stateNodes: Map<string, GraphNode>,
  stateToInputs: Map<string, { inputNodeId: string; stateName: string; setterName: string }[]>
): string {
  const indent = '      ';
  const trace = (idx: number) => traceInputValue(node, idx, nodeMap, analysis, stateNodes, stateToInputs);
  
  switch (node.type) {
    case 'ui-text': {
      const tag = node.properties.tag || 'p';
      let content = trace(1); // content input at port index 1
      
      if (content && content !== 'null') {
        if (content.startsWith('"') && content.endsWith('"')) {
          const text = content.slice(1, -1);
          return `${indent}<${tag} className="text-gray-800">${text}</${tag}>`;
        }
        return `${indent}<${tag} className="text-gray-800">{${content}}</${tag}>`;
      }
      
      const staticContent = node.properties.content || node.properties.text || 'Text content';
      return `${indent}<${tag} className="text-gray-800">${staticContent}</${tag}>`;
    }
    
    case 'ui-button': {
      const variant = node.properties.variant || 'primary';
      const variantClasses: Record<string, string> = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white',
        secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
      };
      
      let label = trace(1);
      let labelContent: string;
      if (label) {
        if (label.startsWith('"') && label.endsWith('"')) {
          labelContent = label.slice(1, -1);
        } else {
          labelContent = `{${label}}`;
        }
      } else {
        labelContent = node.properties.text || 'Button';
      }
      
      const action = findFlowAction(node, 0, nodeMap, analysis, stateNodes, stateToInputs);
      let onClickAttr = '';
      if (action.type !== 'none') {
        onClickAttr = `onClick={() => { ${action.code}; }}`;
      }
      
      return `${indent}<button ${onClickAttr} className="px-4 py-2 rounded ${variantClasses[variant] || variantClasses.primary}">
${indent}  ${labelContent}
${indent}</button>`;
    }
    
    case 'ui-input': {
      const placeholder = node.properties.placeholder || 'Enter text...';
      const inputType = node.properties.inputType || 'text';
      
      let ph = trace(1);
      let placeholderAttr = `placeholder="${placeholder}"`;
      if (ph && ph.startsWith('"')) {
        placeholderAttr = `placeholder=${ph}`;
      }
      
      const bindings = stateToInputs.get(node.id) || [];
      let valueAttr = '';
      let onChangeAttr = '';
      
      if (bindings.length > 0) {
        const binding = bindings[0];
        valueAttr = `value={${binding.stateName}}`;
        onChangeAttr = `onChange={(e) => ${binding.setterName}(e.target.value)}`;
      } else {
        const valueInput = trace(2);
        if (valueInput && valueInput !== 'null') {
          valueAttr = `value={${valueInput}}`;
          
          const incoming = analysis.incoming.get(node.id) || [];
          for (const conn of incoming) {
            if (getPortIndex(conn.toPort) === 2) {
              const sourceNode = nodeMap.get(conn.fromNode);
              if (sourceNode?.type === 'hook-useState') {
                const setterName = `set${toPascalCase(sourceNode.properties.name || 'state')}`;
                onChangeAttr = `onChange={(e) => ${setterName}(e.target.value)}`;
                break;
              }
            }
          }
        }
      }
      
      return `${indent}<input
${indent}  type="${inputType}"
${indent}  ${placeholderAttr}
${indent}  ${valueAttr}
${indent}  ${onChangeAttr}
${indent}  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
${indent}/>`;
    }
    
    case 'ui-container': {
      const layout = node.properties.layout || 'flex-col';
      const gap = node.properties.gap || 4;
      
      const childrenTrace = trace(1);
      
      if (childrenTrace && childrenTrace !== 'null') {
        return `${indent}<div className="flex ${layout} gap-${gap}">
${indent}  {${childrenTrace}}
${indent}</div>`;
      }
      
      return `${indent}<div className="flex ${layout} gap-${gap}">
${indent}  {/* Container children */}
${indent}</div>`;
    }
    
    case 'ui-image': {
      let src = trace(1);
      let srcAttr: string;
      
      if (src) {
        if (src.startsWith('"') && src.endsWith('"')) {
          srcAttr = `src=${src}`;
        } else {
          srcAttr = `src={${src}}`;
        }
      } else {
        srcAttr = `src="${node.properties.src || 'https://via.placeholder.com/400x300'}"`;
      }
      
      const alt = node.properties.alt || 'Image';
      
      return `${indent}<img
${indent}  ${srcAttr}
${indent}  alt="${alt}"
${indent}  className="max-w-full h-auto rounded"
${indent}/>`;
    }
    
    case 'ui-list': {
      let items = trace(1);
      if (!items || items === 'null') {
        items = '[]';
      }
      
      return `${indent}<ul className="space-y-2">
${indent}  {(${items}).map((item: any, index: number) => (
${indent}    <li key={index} className="p-2 bg-gray-100 rounded">
${indent}      {typeof item === 'object' ? JSON.stringify(item) : String(item)}
${indent}    </li>
${indent}  ))}
${indent}</ul>`;
    }
    
    default:
      return '';
  }
}
