import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useGraph } from '../store/GraphStore';
import { getNodeDefinition, GraphNode, Connection } from '../types/nodes';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get port index from port ID
function getPortIndex(portId: string): number {
  const match = portId.match(/_(?:in|out)_(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

// Build a map of connections for quick lookup
function buildConnectionMap(connections: Connection[]) {
  const byToPort = new Map<string, Connection>();
  const byFromPort = new Map<string, Connection[]>();
  const byFromNode = new Map<string, Connection[]>();
  const byToNode = new Map<string, Connection[]>();
  
  for (const conn of connections) {
    byToPort.set(conn.toPort, conn);
    
    if (!byFromPort.has(conn.fromPort)) {
      byFromPort.set(conn.fromPort, []);
    }
    byFromPort.get(conn.fromPort)!.push(conn);
    
    if (!byFromNode.has(conn.fromNode)) {
      byFromNode.set(conn.fromNode, []);
    }
    byFromNode.get(conn.fromNode)!.push(conn);
    
    if (!byToNode.has(conn.toNode)) {
      byToNode.set(conn.toNode, []);
    }
    byToNode.get(conn.toNode)!.push(conn);
  }
  
  return { byToPort, byFromPort, byFromNode, byToNode };
}

type ConnMap = ReturnType<typeof buildConnectionMap>;
type StateMap = Map<string, any>;
type SetStateFunc = (name: string, value: any) => void;
type RefMap = Map<string, React.RefObject<any>>;

// Context for evaluation
interface EvalContext {
  nodes: GraphNode[];
  connMap: ConnMap;
  stateValues: StateMap;
  setStateValue: SetStateFunc;
  refMap: RefMap;
  asyncResults: Map<string, any>;
  setAsyncResult: (nodeId: string, value: any) => void;
  memoCache: Map<string, any>;
}

// Trace the value of an input port by following connections
function traceValue(
  nodeId: string,
  inputIndex: number,
  ctx: EvalContext,
  visited: Set<string> = new Set()
): any {
  const portId = `${nodeId}_in_${inputIndex}`;
  const conn = ctx.connMap.byToPort.get(portId);
  
  if (!conn) return undefined;
  
  const sourceNode = ctx.nodes.find(n => n.id === conn.fromNode);
  if (!sourceNode) return undefined;
  
  // Avoid infinite loops but allow re-evaluation for state nodes
  const visitKey = `${sourceNode.id}_${getPortIndex(conn.fromPort)}`;
  if (visited.has(visitKey) && sourceNode.type !== 'hook-useState') {
    return undefined;
  }
  
  visited.add(visitKey);
  const outputIndex = getPortIndex(conn.fromPort);
  
  return evaluateNode(sourceNode, outputIndex, ctx, visited);
}

// Evaluate a node's output value
function evaluateNode(
  node: GraphNode,
  outputIndex: number,
  ctx: EvalContext,
  visited: Set<string> = new Set()
): any {
  const trace = (idx: number) => traceValue(node.id, idx, ctx, new Set(visited));
  
  switch (node.type) {
    // Data nodes
    case 'data-string':
      return node.properties.value ?? '';
      
    case 'data-number':
      return Number(node.properties.value ?? 0);
      
    case 'data-boolean':
      return Boolean(node.properties.value ?? false);
      
    case 'data-object': {
      try {
        const val = node.properties.value;
        if (typeof val === 'string') return JSON.parse(val);
        return val ?? {};
      } catch {
        return {};
      }
    }
    
    case 'data-array': {
      // Get items from connections
      const items: any[] = [];
      for (let i = 0; i < 20; i++) {
        const item = trace(i);
        if (item !== undefined) items.push(item);
      }
      if (items.length === 0) {
        // Try to parse from properties
        try {
          const val = node.properties.value;
          if (typeof val === 'string') return JSON.parse(val);
          if (Array.isArray(val)) return val;
        } catch {}
        return [];
      }
      return items;
    }
    
    case 'data-concat': {
      const a = trace(0) ?? '';
      const b = trace(1) ?? '';
      return String(a) + String(b);
    }
    
    case 'data-get': {
      const obj = trace(0);
      const key = trace(1) ?? node.properties.key ?? '';
      if (typeof obj !== 'object' || obj === null) return undefined;
      return obj[key];
    }
    
    case 'data-set': {
      const obj = trace(0) ?? {};
      const key = trace(1) ?? node.properties.key ?? '';
      const value = trace(2);
      return { ...obj, [key]: value };
    }
    
    // String operations
    case 'string-includes': {
      const str = String(trace(0) ?? '');
      const search = String(trace(1) ?? '');
      const caseSensitive = Boolean(node.properties.caseSensitive);
      if (!caseSensitive) {
        return str.toLowerCase().includes(search.toLowerCase());
      }
      return str.includes(search);
    }
    
    case 'string-lowercase': {
      const str = String(trace(0) ?? '');
      return str.toLowerCase();
    }
    
    // Hooks
    case 'hook-useState': {
      const name = node.properties.name || 'state';
      if (outputIndex === 0) {
        // Return current value from state
        if (ctx.stateValues.has(name)) {
          return ctx.stateValues.get(name);
        }
        // Return initial value
        const initial = trace(0);
        if (initial !== undefined) return initial;
        return node.properties.initialValue ?? '';
      }
      // Output 1 is the setter function reference
      return { __setter__: true, name };
    }
    
    case 'hook-useRef': {
      const name = node.properties.name || 'ref';
      if (!ctx.refMap.has(name)) {
        return { current: null };
      }
      return ctx.refMap.get(name);
    }
    
    case 'hook-useMemo': {
      const memoKey = node.id;
      if (ctx.memoCache.has(memoKey)) {
        return ctx.memoCache.get(memoKey);
      }
      const computedValue = trace(0);
      ctx.memoCache.set(memoKey, computedValue);
      return computedValue;
    }
    
    // Math operations
    case 'math-add': {
      const a = Number(trace(0) ?? 0);
      const b = Number(trace(1) ?? 0);
      return a + b;
    }
    
    case 'math-subtract': {
      const a = Number(trace(0) ?? 0);
      const b = Number(trace(1) ?? 0);
      return a - b;
    }
    
    case 'math-multiply': {
      const a = Number(trace(0) ?? 0);
      const b = Number(trace(1) ?? 0);
      return a * b;
    }
    
    case 'math-divide': {
      const a = Number(trace(0) ?? 0);
      const b = Number(trace(1) ?? 1);
      return b !== 0 ? a / b : 0;
    }
    
    // Logic operations
    case 'logic-compare': {
      const a = trace(0);
      const b = trace(1);
      const op = node.properties.operator || '===';
      switch (op) {
        case '==':
        case '===': return a === b;
        case '!=':
        case '!==': return a !== b;
        case '>': return Number(a) > Number(b);
        case '<': return Number(a) < Number(b);
        case '>=': return Number(a) >= Number(b);
        case '<=': return Number(a) <= Number(b);
        default: return false;
      }
    }
    
    case 'logic-and':
      return Boolean(trace(0)) && Boolean(trace(1));
      
    case 'logic-or':
      return Boolean(trace(0)) || Boolean(trace(1));
      
    case 'logic-not':
      return !Boolean(trace(0));
    
    case 'logic-condition': {
      const condition = Boolean(trace(0));
      const trueValue = trace(1);
      const falseValue = trace(2);
      return condition ? trueValue : falseValue;
    }
    
    // Array operations
    case 'array-map': {
      const arr = trace(0);
      if (!Array.isArray(arr)) return [];
      return arr;
    }
    
    case 'array-filter': {
      const arr = trace(0);
      const searchText = trace(1);
      
      if (!Array.isArray(arr)) return [];
      if (searchText === undefined || searchText === null || searchText === '') {
        return arr;
      }
      
      const searchLower = String(searchText).toLowerCase();
      const caseSensitive = Boolean(node.properties.caseSensitive);
      
      // Filter items that contain the search text
      return arr.filter(item => {
        const str = typeof item === 'object' ? JSON.stringify(item) : String(item);
        if (caseSensitive) {
          return str.includes(String(searchText));
        }
        return str.toLowerCase().includes(searchLower);
      });
    }
    
    case 'array-find': {
      const arr = trace(0);
      const searchText = trace(1);
      if (!Array.isArray(arr)) return undefined;
      return arr.find(item => {
        const str = typeof item === 'object' ? JSON.stringify(item) : String(item);
        return str.toLowerCase().includes(String(searchText).toLowerCase());
      });
    }
    
    case 'array-push': {
      const arr = trace(0);
      const item = trace(1);
      if (!Array.isArray(arr)) return [item];
      return [...arr, item];
    }
    
    case 'array-length': {
      const arr = trace(0);
      if (!Array.isArray(arr)) return 0;
      return arr.length;
    }
    
    // Async operations
    case 'async-fetch': {
      if (ctx.asyncResults.has(node.id)) {
        const result = ctx.asyncResults.get(node.id);
        // outputIndex 2 = data, 3 = error, 4 = loading
        if (outputIndex === 2) return result?.data;
        if (outputIndex === 3) return result?.error;
        if (outputIndex === 4) return result?.loading;
        return result;
      }
      return outputIndex === 4 ? true : null;
    }
    
    case 'async-delay': {
      if (ctx.asyncResults.has(node.id)) {
        return ctx.asyncResults.get(node.id);
      }
      return trace(1);
    }
    
    // UI nodes - return their content for expressions
    case 'ui-input':
      if (outputIndex === 1) {
        const valueConn = ctx.connMap.byToPort.get(`${node.id}_in_2`);
        if (valueConn) {
          const stateNode = ctx.nodes.find(n => n.id === valueConn.fromNode && n.type === 'hook-useState');
          if (stateNode) {
            const stateName = stateNode.properties.name || 'state';
            return ctx.stateValues.get(stateName) ?? '';
          }
        }
        return '';
      }
      return undefined;
    
    default:
      return undefined;
  }
}

// Execute a flow action (button click, etc.)
function executeFlowAction(
  node: GraphNode,
  ctx: EvalContext
): void {
  const trace = (idx: number) => traceValue(node.id, idx, ctx, new Set());
  
  switch (node.type) {
    case 'debug-log': {
      const message = trace(1) ?? 'Debug';
      console.log('[Debug]', message);
      break;
    }
    
    case 'hook-useState': {
      const name = node.properties.name || 'state';
      const newValue = trace(0);
      if (newValue !== undefined) {
        ctx.setStateValue(name, newValue);
      }
      break;
    }
    
    case 'array-push': {
      const currentArr = trace(0) ?? [];
      const newItem = trace(1);
      const newArr = Array.isArray(currentArr) ? [...currentArr, newItem] : [newItem];
      
      const inputConn = ctx.connMap.byToPort.get(`${node.id}_in_0`);
      if (inputConn) {
        const stateNode = ctx.nodes.find(n => n.id === inputConn.fromNode && n.type === 'hook-useState');
        if (stateNode) {
          ctx.setStateValue(stateNode.properties.name || 'state', newArr);
        }
      }
      break;
    }
    
    case 'logic-condition': {
      const condition = Boolean(trace(0));
      const outConns = ctx.connMap.byFromNode.get(node.id) || [];
      for (const conn of outConns) {
        const outPort = getPortIndex(conn.fromPort);
        if ((condition && outPort === 0) || (!condition && outPort === 1)) {
          const targetNode = ctx.nodes.find(n => n.id === conn.toNode);
          if (targetNode) {
            executeFlowAction(targetNode, ctx);
          }
        }
      }
      break;
    }
    
    default: {
      const outConns = ctx.connMap.byFromNode.get(node.id) || [];
      for (const conn of outConns) {
        const outPort = getPortIndex(conn.fromPort);
        if (outPort === 0) {
          const targetNode = ctx.nodes.find(n => n.id === conn.toNode);
          if (targetNode) {
            executeFlowAction(targetNode, ctx);
          }
        }
      }
    }
  }
}

// Handle button click
function handleButtonClick(
  buttonNode: GraphNode,
  ctx: EvalContext
): void {
  let label = traceValue(buttonNode.id, 1, ctx, new Set());
  if (label === undefined) {
    label = buttonNode.properties.label || buttonNode.properties.text || 'Button';
  }
  
  console.log('Button clicked:', label);
  
  // Find connected flow actions (onClick is port 0)
  const outConns = ctx.connMap.byFromNode.get(buttonNode.id) || [];
  
  let hasFlowAction = false;
  for (const conn of outConns) {
    const fromPort = getPortIndex(conn.fromPort);
    if (fromPort === 0) {
      hasFlowAction = true;
      const targetNode = ctx.nodes.find(n => n.id === conn.toNode);
      if (targetNode) {
        executeFlowAction(targetNode, ctx);
      }
    }
  }
  
  // Special handling for +/- buttons on number states
  if (label === '+' || label === '-') {
    const stateNodes = ctx.nodes.filter(n => n.type === 'hook-useState');
    for (const stateNode of stateNodes) {
      const stateName = stateNode.properties.name || 'state';
      const currentValue = ctx.stateValues.get(stateName);
      if (typeof currentValue === 'number' || (typeof currentValue === 'string' && !isNaN(Number(currentValue)) && currentValue !== '')) {
        const newValue = label === '+' 
          ? Number(currentValue || 0) + 1 
          : Number(currentValue || 0) - 1;
        ctx.setStateValue(stateName, newValue);
        return;
      }
    }
  }
  
  // Toggle button pattern
  if (label.toLowerCase().includes('toggle') || label.toLowerCase().includes('afficher') || label.toLowerCase().includes('masquer')) {
    const toggleState = ctx.nodes.find(n => 
      n.type === 'hook-useState' && 
      (n.properties.name?.toLowerCase().includes('show') || 
       n.properties.name?.toLowerCase().includes('visible') ||
       n.properties.name?.toLowerCase().includes('open') ||
       n.properties.name?.toLowerCase().includes('content'))
    );
    if (toggleState) {
      const stateName = toggleState.properties.name || 'state';
      const currentValue = ctx.stateValues.get(stateName);
      ctx.setStateValue(stateName, !currentValue);
      return;
    }
  }
  
  // Generic toggle for boolean states
  if (!hasFlowAction) {
    const boolStates = ctx.nodes.filter(n => {
      if (n.type !== 'hook-useState') return false;
      const name = n.properties.name || '';
      const value = ctx.stateValues.get(name);
      return typeof value === 'boolean';
    });
    
    if (boolStates.length > 0) {
      const stateNode = boolStates[0];
      const stateName = stateNode.properties.name || 'state';
      const currentValue = ctx.stateValues.get(stateName);
      ctx.setStateValue(stateName, !currentValue);
      return;
    }
  }
  
  // Add button pattern
  if (label.toLowerCase().includes('ajouter') || label.toLowerCase().includes('add')) {
    const arrayState = ctx.nodes.find(n => 
      n.type === 'hook-useState' && 
      (n.properties.name?.toLowerCase().includes('item') || 
       n.properties.name?.toLowerCase().includes('todo') ||
       n.properties.name?.toLowerCase().includes('list'))
    );
    const inputState = ctx.nodes.find(n => 
      n.type === 'hook-useState' && 
      (n.properties.name?.toLowerCase().includes('new') || 
       n.properties.name?.toLowerCase().includes('input'))
    );
    
    if (arrayState && inputState) {
      const arrayName = arrayState.properties.name || 'items';
      const inputName = inputState.properties.name || 'newItem';
      const currentArray = ctx.stateValues.get(arrayName) || [];
      const newItem = ctx.stateValues.get(inputName) || '';
      
      if (newItem && newItem.toString().trim()) {
        const newArray = Array.isArray(currentArray) ? [...currentArray, newItem] : [newItem];
        ctx.setStateValue(arrayName, newArray);
        ctx.setStateValue(inputName, '');
      }
      return;
    }
  }
  
  // Tab switching pattern
  if (label.toLowerCase().includes('tab')) {
    const tabMatch = label.match(/\d+/);
    if (tabMatch) {
      const tabNum = parseInt(tabMatch[0]);
      const tabState = ctx.nodes.find(n => 
        n.type === 'hook-useState' && 
        (n.properties.name?.toLowerCase().includes('tab') ||
         n.properties.name?.toLowerCase().includes('active'))
      );
      if (tabState) {
        ctx.setStateValue(tabState.properties.name || 'tab', tabNum);
        return;
      }
    }
  }
  
  // View switching pattern
  if (label.toLowerCase().includes('view') || label.toLowerCase().includes('vue')) {
    const viewMatch = label.match(/\d+/);
    if (viewMatch) {
      const viewNum = parseInt(viewMatch[0]);
      const viewState = ctx.nodes.find(n => 
        n.type === 'hook-useState' && 
        (n.properties.name?.toLowerCase().includes('view') ||
         n.properties.name?.toLowerCase().includes('vue') ||
         n.properties.name?.toLowerCase().includes('current'))
      );
      if (viewState) {
        ctx.setStateValue(viewState.properties.name || 'view', viewNum);
        return;
      }
    }
  }
}

// Find children of a container node
function findContainerChildren(
  containerNode: GraphNode,
  nodes: GraphNode[],
  connMap: ConnMap
): GraphNode[] {
  const children: GraphNode[] = [];
  const outConns = connMap.byFromNode.get(containerNode.id) || [];
  
  for (const conn of outConns) {
    const fromPort = getPortIndex(conn.fromPort);
    if (fromPort === 0) {
      const targetNode = nodes.find(n => n.id === conn.toNode);
      if (targetNode && targetNode.type.startsWith('ui-')) {
        const toPort = getPortIndex(conn.toPort);
        if (toPort === 0) {
          children.push(targetNode);
        }
      }
    }
  }
  
  return children.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 50) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
}

// Check if a node should be visible based on conditions
function isNodeVisible(
  node: GraphNode,
  ctx: EvalContext
): boolean {
  const inConns = ctx.connMap.byToNode.get(node.id) || [];
  
  for (const conn of inConns) {
    const toPort = getPortIndex(conn.toPort);
    if (toPort === 0) {
      const sourceNode = ctx.nodes.find(n => n.id === conn.fromNode);
      
      if (sourceNode?.type === 'logic-if') {
        const fromPort = getPortIndex(conn.fromPort);
        const condition = traceValue(sourceNode.id, 1, ctx, new Set());
        
        if (fromPort === 0) return Boolean(condition);
        if (fromPort === 1) return !Boolean(condition);
      }
      
      if (sourceNode?.type === 'logic-condition') {
        const fromPort = getPortIndex(conn.fromPort);
        const condition = traceValue(sourceNode.id, 0, ctx, new Set());
        
        if (fromPort === 0) return Boolean(condition);
        if (fromPort === 1) return !Boolean(condition);
      }
    }
  }
  
  return true;
}

// Dynamic component renderer
const RenderNode: React.FC<{
  node: GraphNode;
  ctx: EvalContext;
  renderedNodes: Set<string>;
}> = ({ node, ctx, renderedNodes }) => {
  const def = getNodeDefinition(node.type);
  if (!def) return null;

  if (!isNodeVisible(node, ctx)) {
    return null;
  }

  renderedNodes.add(node.id);

  const trace = (inputIndex: number) => 
    traceValue(node.id, inputIndex, ctx, new Set());

  switch (node.type) {
    case 'ui-button': {
      const variant = node.properties.variant || 'primary';
      const variantClasses: Record<string, string> = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white',
        secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
      };
      
      let label = trace(1);
      if (label === undefined) {
        label = node.properties.label || node.properties.text || 'Button';
      }
      
      return (
        <button
          className={`px-4 py-2 rounded font-medium transition-colors ${variantClasses[variant]}`}
          onClick={() => handleButtonClick(node, ctx)}
        >
          {String(label)}
        </button>
      );
    }

    case 'ui-input': {
      const placeholder = trace(1) ?? node.properties.placeholder ?? 'Enter text...';
      const inputType = node.properties.type || 'text';
      
      let value = '';
      let onChange = (_v: string) => {};
      
      const valueConn = ctx.connMap.byToPort.get(`${node.id}_in_2`);
      if (valueConn) {
        const stateNode = ctx.nodes.find(n => n.id === valueConn.fromNode && n.type === 'hook-useState');
        if (stateNode) {
          const stateName = stateNode.properties.name || 'state';
          value = ctx.stateValues.get(stateName) ?? '';
          onChange = (v: string) => ctx.setStateValue(stateName, v);
        }
      }
      
      return (
        <input
          type={inputType}
          placeholder={String(placeholder)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    case 'ui-text': {
      const tag = node.properties.tag || 'p';
      
      let content = trace(1);
      if (content === undefined) {
        content = node.properties.content || node.properties.text || '';
      }
      
      if (typeof content === 'boolean') {
        content = content ? 'Vrai' : 'Faux';
      } else if (content === null || content === undefined) {
        content = '';
      } else if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
      }
      
      const classNames: Record<string, string> = {
        h1: 'text-3xl font-bold',
        h2: 'text-2xl font-bold',
        h3: 'text-xl font-bold',
        p: 'text-base',
        span: 'text-base inline',
        pre: 'text-sm font-mono bg-gray-100 p-2 rounded whitespace-pre-wrap',
      };
      const className = `text-gray-800 ${classNames[tag] || ''}`;
      const displayContent = String(content);
      
      switch (tag) {
        case 'h1': return <h1 className={className}>{displayContent}</h1>;
        case 'h2': return <h2 className={className}>{displayContent}</h2>;
        case 'h3': return <h3 className={className}>{displayContent}</h3>;
        case 'span': return <span className={className}>{displayContent}</span>;
        case 'pre': return <pre className={className}>{displayContent}</pre>;
        default: return <p className={className}>{displayContent}</p>;
      }
    }

    case 'ui-container': {
      const layout = node.properties.layout || 'flex-col';
      const gap = node.properties.gap || 4;
      
      const childNodes = findContainerChildren(node, ctx.nodes, ctx.connMap);
      const childrenToRender = childNodes.filter(c => !renderedNodes.has(c.id));
      
      const layoutClass = layout === 'flex-row' ? 'flex-row' : 'flex-col';
      
      return (
        <div
          className={`flex ${layoutClass} p-4 border border-dashed border-gray-300 rounded bg-gray-50`}
          style={{ gap: `${gap * 4}px` }}
        >
          {childrenToRender.length > 0 ? (
            childrenToRender.map(child => (
              <RenderNode 
                key={child.id} 
                node={child} 
                ctx={ctx}
                renderedNodes={renderedNodes}
              />
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">Container</span>
          )}
        </div>
      );
    }

    case 'ui-image': {
      const src = trace(1) ?? node.properties.src ?? 'https://via.placeholder.com/200x150';
      const alt = trace(2) ?? node.properties.alt ?? 'Image';
      
      return (
        <img 
          src={String(src)} 
          alt={String(alt)}
          className="max-w-full h-auto rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x150?text=Error';
          }}
        />
      );
    }

    case 'ui-list': {
      let items = trace(1);
      
      if (!Array.isArray(items)) {
        items = [];
      }
      
      if (items.length === 0) {
        return (
          <div className="text-gray-400 text-sm italic p-2 border border-dashed border-gray-300 rounded">
            Liste vide - tapez pour filtrer
          </div>
        );
      }
      
      return (
        <ul className="space-y-1 w-full">
          {items.map((item: any, i: number) => (
            <li key={i} className="px-3 py-2 bg-gray-100 rounded text-gray-700">
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    default:
      return null;
  }
};

// Initialize states from graph nodes
function initializeStates(nodes: GraphNode[], connMap: ConnMap): Map<string, any> {
  const states = new Map<string, any>();
  
  // Create a minimal context for tracing initial values
  const traceCtx: EvalContext = {
    nodes,
    connMap,
    stateValues: states,
    setStateValue: () => {},
    refMap: new Map(),
    asyncResults: new Map(),
    setAsyncResult: () => {},
    memoCache: new Map()
  };
  
  for (const node of nodes) {
    if (node.type === 'hook-useState') {
      const name = node.properties.name || 'state';
      
      // Try to trace initial value from connections
      let initialValue: any = undefined;
      
      // Check if there's a connection to the initialValue input (port 0)
      const initConn = connMap.byToPort.get(`${node.id}_in_0`);
      if (initConn) {
        const sourceNode = nodes.find(n => n.id === initConn.fromNode);
        if (sourceNode) {
          const outputIndex = getPortIndex(initConn.fromPort);
          initialValue = evaluateNode(sourceNode, outputIndex, traceCtx, new Set());
        }
      }
      
      // Fallback to properties
      if (initialValue === undefined) {
        initialValue = node.properties.initialValue;
        
        // Parse string values
        if (typeof initialValue === 'string') {
          if (initialValue === 'true') initialValue = true;
          else if (initialValue === 'false') initialValue = false;
          else if (!isNaN(Number(initialValue)) && initialValue !== '') initialValue = Number(initialValue);
          else if (initialValue.startsWith('[') || initialValue.startsWith('{')) {
            try { initialValue = JSON.parse(initialValue); } catch {}
          }
        }
      }
      
      if (initialValue === undefined) {
        initialValue = '';
      }
      
      states.set(name, initialValue);
    }
  }
  
  return states;
}

// Async effects manager
const AsyncEffects: React.FC<{
  nodes: GraphNode[];
  connMap: ConnMap;
  stateValues: StateMap;
  setAsyncResult: (nodeId: string, value: any) => void;
}> = ({ nodes, connMap, stateValues, setAsyncResult }) => {
  
  useEffect(() => {
    const fetchNodes = nodes.filter(n => n.type === 'async-fetch');
    
    for (const node of fetchNodes) {
      const traceCtx: EvalContext = {
        nodes,
        connMap,
        stateValues,
        setStateValue: () => {},
        refMap: new Map(),
        asyncResults: new Map(),
        setAsyncResult: () => {},
        memoCache: new Map()
      };
      
      const url = traceValue(node.id, 1, traceCtx, new Set()) || node.properties.url;
      
      if (url && typeof url === 'string') {
        fetch(url)
          .then(res => res.json())
          .then(data => {
            setAsyncResult(node.id, { loading: false, data, error: null });
          })
          .catch(err => {
            setAsyncResult(node.id, { loading: false, data: null, error: err.message });
          });
      }
    }
  }, [nodes, connMap]);
  
  useEffect(() => {
    const delayNodes = nodes.filter(n => n.type === 'async-delay');
    const timers: NodeJS.Timeout[] = [];
    
    for (const node of delayNodes) {
      const ms = node.properties.duration || node.properties.ms || 1000;
      const traceCtx: EvalContext = {
        nodes,
        connMap,
        stateValues,
        setStateValue: () => {},
        refMap: new Map(),
        asyncResults: new Map(),
        setAsyncResult: () => {},
        memoCache: new Map()
      };
      
      const value = traceValue(node.id, 1, traceCtx, new Set());
      
      const timer = setTimeout(() => {
        setAsyncResult(node.id, value);
      }, ms);
      
      timers.push(timer);
    }
    
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [nodes, connMap]);
  
  return null;
};

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose }) => {
  const { activeGraph } = useGraph();
  const [stateValues, setStateValues] = useState<Map<string, any>>(new Map());
  const [asyncResults, setAsyncResults] = useState<Map<string, any>>(new Map());
  const [memoCache] = useState<Map<string, any>>(new Map());
  const refMap = useRef<Map<string, React.RefObject<any>>>(new Map());
  
  const connMap = useMemo(() => {
    if (!activeGraph) return buildConnectionMap([]);
    return buildConnectionMap(activeGraph.connections);
  }, [activeGraph]);
  
  // Initialize states from useState nodes
  useEffect(() => {
    if (!activeGraph) return;
    
    const initialStates = initializeStates(activeGraph.nodes, connMap);
    setStateValues(initialStates);
    setAsyncResults(new Map());
  }, [activeGraph?.id, connMap]);
  
  const setStateValue = useCallback((name: string, value: any) => {
    setStateValues(prev => {
      const next = new Map(prev);
      next.set(name, value);
      return next;
    });
  }, []);
  
  const setAsyncResult = useCallback((nodeId: string, value: any) => {
    setAsyncResults(prev => {
      const next = new Map(prev);
      next.set(nodeId, value);
      return next;
    });
  }, []);

  // Find root UI nodes (not children of containers)
  const rootUiNodes = useMemo(() => {
    if (!activeGraph) return [];
    
    const uiNodes = activeGraph.nodes
      .filter(node => node.type.startsWith('ui-'))
      .sort((a, b) => a.y - b.y);
    
    const childNodeIds = new Set<string>();
    
    for (const node of activeGraph.nodes) {
      if (node.type === 'ui-container') {
        const children = findContainerChildren(node, activeGraph.nodes, connMap);
        for (const child of children) {
          childNodeIds.add(child.id);
        }
      }
    }
    
    return uiNodes.filter(n => !childNodeIds.has(n.id));
  }, [activeGraph, connMap]);

  if (!isOpen) return null;

  const ctx: EvalContext = {
    nodes: activeGraph?.nodes || [],
    connMap,
    stateValues,
    setStateValue,
    refMap: refMap.current,
    asyncResults,
    setAsyncResult,
    memoCache
  };

  const renderedNodes = new Set<string>();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">▶️ Aperçu</h2>
            <p className="text-sm text-gray-500">{activeGraph?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Debug info */}
        <div className="px-6 py-2 bg-blue-50 border-b text-xs overflow-x-auto">
          <div className="flex gap-4 text-blue-700 whitespace-nowrap">
            <span>
              <strong>États:</strong>{' '}
              {Array.from(stateValues.entries())
                .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join(', ') || 'aucun'}
            </span>
          </div>
        </div>

        {/* Async effects */}
        {activeGraph && (
          <AsyncEffects 
            nodes={activeGraph.nodes}
            connMap={connMap}
            stateValues={stateValues}
            setAsyncResult={setAsyncResult}
          />
        )}

        {/* Preview content */}
        <div className="flex-1 overflow-auto p-6">
          {rootUiNodes.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-4">🎨</p>
              <p>Aucun composant UI dans ce graphe.</p>
              <p className="text-sm">Ajoutez des nœuds UI (Button, Input, Text...) pour voir l'aperçu.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rootUiNodes.map(node => (
                <RenderNode 
                  key={node.id} 
                  node={node} 
                  ctx={ctx}
                  renderedNodes={renderedNodes}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            Ceci est un aperçu interactif. Les états sont réinitialisés à chaque ouverture.
          </p>
        </div>
      </div>
    </div>
  );
};
