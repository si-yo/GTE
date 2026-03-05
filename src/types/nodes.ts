// Types de nœuds pour l'éditeur visuel

export type NodeCategory = 
  | 'ui' 
  | 'state' 
  | 'logic' 
  | 'async' 
  | 'event' 
  | 'entity' 
  | 'hook'
  | 'data'
  | 'math'
  | 'custom'
  | 'plugin';

export type PortDataType = 'flow' | 'string' | 'number' | 'boolean' | 'any' | 'array' | 'object' | 'ref' | 'state' | 'effect';

export interface PortDefinition {
  id: string;
  name: string;
  type: PortDataType;
}

export interface Port {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'flow' | 'string' | 'number' | 'boolean' | 'any' | 'array' | 'object' | 'ref' | 'state' | 'effect';
  connected?: boolean;
  value?: any;
}

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  icon: string;
  inputs: Omit<Port, 'id' | 'connected'>[];
  outputs: Omit<Port, 'id' | 'connected'>[];
  properties?: NodeProperty[];
  color: string;
}

export interface NodeProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'code';
  default?: any;
  options?: string[];
}

export interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  inputs: Port[];
  outputs: Port[];
  properties: Record<string, any>;
  width?: number;
  height?: number;
}

export interface Connection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface Graph {
  id: string;
  name: string;
  nodes: GraphNode[];
  connections: Connection[];
}

export interface EntityAttribute {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'ref';
  defaultValue?: any;
}

export interface Entity {
  id: string;
  name: string;
  attributes: EntityAttribute[];
  methods: Graph[];
}

// Définitions des nœuds disponibles
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // UI Nodes
  {
    type: 'ui-button',
    category: 'ui',
    label: 'Button',
    icon: '🔘',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'label', type: 'input', dataType: 'string' },
      { name: 'disabled', type: 'input', dataType: 'boolean' },
    ],
    outputs: [
      { name: 'onClick', type: 'output', dataType: 'flow' },
      { name: 'element', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'variant', type: 'select', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    ],
  },
  {
    type: 'ui-input',
    category: 'ui',
    label: 'Input',
    icon: '📝',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'placeholder', type: 'input', dataType: 'string' },
      { name: 'value', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'onChange', type: 'output', dataType: 'flow' },
      { name: 'value', type: 'output', dataType: 'string' },
      { name: 'element', type: 'output', dataType: 'any' },
    ],
  },
  {
    type: 'ui-text',
    category: 'ui',
    label: 'Text',
    icon: '📄',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'content', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'element', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'tag', type: 'select', options: ['p', 'h1', 'h2', 'h3', 'span'], default: 'p' },
    ],
  },
  {
    type: 'ui-container',
    category: 'ui',
    label: 'Container',
    icon: '📦',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'children', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'element', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'layout', type: 'select', options: ['flex-row', 'flex-col', 'grid'], default: 'flex-col' },
      { name: 'gap', type: 'number', default: 4 },
    ],
  },
  {
    type: 'ui-image',
    category: 'ui',
    label: 'Image',
    icon: '🖼️',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'src', type: 'input', dataType: 'string' },
      { name: 'alt', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'element', type: 'output', dataType: 'any' },
    ],
  },
  {
    type: 'ui-list',
    category: 'ui',
    label: 'List',
    icon: '📋',
    color: '#3B82F6',
    inputs: [
      { name: 'flow', type: 'input', dataType: 'flow' },
      { name: 'items', type: 'input', dataType: 'array' },
      { name: 'template', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'onItem', type: 'output', dataType: 'flow' },
      { name: 'item', type: 'output', dataType: 'any' },
      { name: 'index', type: 'output', dataType: 'number' },
      { name: 'element', type: 'output', dataType: 'any' },
    ],
  },

  // State Hooks
  {
    type: 'hook-useState',
    category: 'hook',
    label: 'useState',
    icon: '🔄',
    color: '#8B5CF6',
    inputs: [
      { name: 'initialValue', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'value', type: 'output', dataType: 'state' },
      { name: 'setValue', type: 'output', dataType: 'flow' },
    ],
    properties: [
      { name: 'name', type: 'string', default: 'state' },
    ],
  },
  {
    type: 'hook-useRef',
    category: 'hook',
    label: 'useRef',
    icon: '📌',
    color: '#8B5CF6',
    inputs: [
      { name: 'initialValue', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'ref', type: 'output', dataType: 'ref' },
      { name: 'current', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'name', type: 'string', default: 'ref' },
    ],
  },
  {
    type: 'hook-useMemo',
    category: 'hook',
    label: 'useMemo',
    icon: '🧠',
    color: '#8B5CF6',
    inputs: [
      { name: 'compute', type: 'input', dataType: 'flow' },
      { name: 'deps', type: 'input', dataType: 'array' },
    ],
    outputs: [
      { name: 'value', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'name', type: 'string', default: 'memoized' },
    ],
  },
  {
    type: 'hook-useEffect',
    category: 'hook',
    label: 'useEffect',
    icon: '⚡',
    color: '#8B5CF6',
    inputs: [
      { name: 'deps', type: 'input', dataType: 'array' },
    ],
    outputs: [
      { name: 'onMount', type: 'output', dataType: 'flow' },
      { name: 'onUpdate', type: 'output', dataType: 'flow' },
      { name: 'onCleanup', type: 'output', dataType: 'flow' },
    ],
  },
  {
    type: 'hook-useCallback',
    category: 'hook',
    label: 'useCallback',
    icon: '🔗',
    color: '#8B5CF6',
    inputs: [
      { name: 'callback', type: 'input', dataType: 'flow' },
      { name: 'deps', type: 'input', dataType: 'array' },
    ],
    outputs: [
      { name: 'memoizedFn', type: 'output', dataType: 'flow' },
    ],
  },

  // Async Nodes
  {
    type: 'async-fetch',
    category: 'async',
    label: 'Fetch API',
    icon: '🌐',
    color: '#F59E0B',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'url', type: 'input', dataType: 'string' },
      { name: 'method', type: 'input', dataType: 'string' },
      { name: 'body', type: 'input', dataType: 'object' },
    ],
    outputs: [
      { name: 'onSuccess', type: 'output', dataType: 'flow' },
      { name: 'onError', type: 'output', dataType: 'flow' },
      { name: 'data', type: 'output', dataType: 'any' },
      { name: 'error', type: 'output', dataType: 'string' },
      { name: 'loading', type: 'output', dataType: 'boolean' },
    ],
    properties: [
      { name: 'method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
    ],
  },
  {
    type: 'async-delay',
    category: 'async',
    label: 'Delay',
    icon: '⏱️',
    color: '#F59E0B',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'ms', type: 'input', dataType: 'number' },
    ],
    outputs: [
      { name: 'onComplete', type: 'output', dataType: 'flow' },
    ],
    properties: [
      { name: 'duration', type: 'number', default: 1000 },
    ],
  },
  {
    type: 'async-promise',
    category: 'async',
    label: 'Promise',
    icon: '🤝',
    color: '#F59E0B',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'executor', type: 'input', dataType: 'flow' },
    ],
    outputs: [
      { name: 'then', type: 'output', dataType: 'flow' },
      { name: 'catch', type: 'output', dataType: 'flow' },
      { name: 'finally', type: 'output', dataType: 'flow' },
      { name: 'result', type: 'output', dataType: 'any' },
    ],
  },

  // Logic Nodes
  {
    type: 'logic-if',
    category: 'logic',
    label: 'If / Else',
    icon: '🔀',
    color: '#10B981',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'condition', type: 'input', dataType: 'boolean' },
    ],
    outputs: [
      { name: 'true', type: 'output', dataType: 'flow' },
      { name: 'false', type: 'output', dataType: 'flow' },
    ],
  },
  {
    type: 'logic-switch',
    category: 'logic',
    label: 'Switch',
    icon: '🔃',
    color: '#10B981',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'value', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'case1', type: 'output', dataType: 'flow' },
      { name: 'case2', type: 'output', dataType: 'flow' },
      { name: 'case3', type: 'output', dataType: 'flow' },
      { name: 'default', type: 'output', dataType: 'flow' },
    ],
    properties: [
      { name: 'case1', type: 'string', default: 'value1' },
      { name: 'case2', type: 'string', default: 'value2' },
      { name: 'case3', type: 'string', default: 'value3' },
    ],
  },
  {
    type: 'logic-loop',
    category: 'logic',
    label: 'For Each',
    icon: '🔁',
    color: '#10B981',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'array', type: 'input', dataType: 'array' },
    ],
    outputs: [
      { name: 'onItem', type: 'output', dataType: 'flow' },
      { name: 'item', type: 'output', dataType: 'any' },
      { name: 'index', type: 'output', dataType: 'number' },
      { name: 'onComplete', type: 'output', dataType: 'flow' },
    ],
  },
  {
    type: 'logic-compare',
    category: 'logic',
    label: 'Compare',
    icon: '⚖️',
    color: '#10B981',
    inputs: [
      { name: 'a', type: 'input', dataType: 'any' },
      { name: 'b', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'boolean' },
    ],
    properties: [
      { name: 'operator', type: 'select', options: ['==', '!=', '>', '<', '>=', '<='], default: '==' },
    ],
  },
  {
    type: 'logic-and',
    category: 'logic',
    label: 'AND',
    icon: '&',
    color: '#10B981',
    inputs: [
      { name: 'a', type: 'input', dataType: 'boolean' },
      { name: 'b', type: 'input', dataType: 'boolean' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'boolean' },
    ],
  },
  {
    type: 'logic-or',
    category: 'logic',
    label: 'OR',
    icon: '|',
    color: '#10B981',
    inputs: [
      { name: 'a', type: 'input', dataType: 'boolean' },
      { name: 'b', type: 'input', dataType: 'boolean' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'boolean' },
    ],
  },
  {
    type: 'logic-not',
    category: 'logic',
    label: 'NOT',
    icon: '!',
    color: '#10B981',
    inputs: [
      { name: 'input', type: 'input', dataType: 'boolean' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'boolean' },
    ],
  },

  // Data Nodes
  {
    type: 'data-string',
    category: 'data',
    label: 'String',
    icon: '📝',
    color: '#EC4899',
    inputs: [],
    outputs: [
      { name: 'value', type: 'output', dataType: 'string' },
    ],
    properties: [
      { name: 'value', type: 'string', default: '' },
    ],
  },
  {
    type: 'data-number',
    category: 'data',
    label: 'Number',
    icon: '🔢',
    color: '#EC4899',
    inputs: [],
    outputs: [
      { name: 'value', type: 'output', dataType: 'number' },
    ],
    properties: [
      { name: 'value', type: 'number', default: 0 },
    ],
  },
  {
    type: 'data-boolean',
    category: 'data',
    label: 'Boolean',
    icon: '✓',
    color: '#EC4899',
    inputs: [],
    outputs: [
      { name: 'value', type: 'output', dataType: 'boolean' },
    ],
    properties: [
      { name: 'value', type: 'boolean', default: false },
    ],
  },
  {
    type: 'data-array',
    category: 'data',
    label: 'Array',
    icon: '📚',
    color: '#EC4899',
    inputs: [
      { name: 'item1', type: 'input', dataType: 'any' },
      { name: 'item2', type: 'input', dataType: 'any' },
      { name: 'item3', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'array', type: 'output', dataType: 'array' },
      { name: 'length', type: 'output', dataType: 'number' },
    ],
  },
  {
    type: 'data-object',
    category: 'data',
    label: 'Object',
    icon: '{}',
    color: '#EC4899',
    inputs: [],
    outputs: [
      { name: 'object', type: 'output', dataType: 'object' },
    ],
    properties: [
      { name: 'fields', type: 'string', default: 'key1,key2' },
    ],
  },
  {
    type: 'data-get',
    category: 'data',
    label: 'Get Property',
    icon: '📥',
    color: '#EC4899',
    inputs: [
      { name: 'object', type: 'input', dataType: 'object' },
      { name: 'key', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'value', type: 'output', dataType: 'any' },
    ],
  },
  {
    type: 'data-set',
    category: 'data',
    label: 'Set Property',
    icon: '📤',
    color: '#EC4899',
    inputs: [
      { name: 'object', type: 'input', dataType: 'object' },
      { name: 'key', type: 'input', dataType: 'string' },
      { name: 'value', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'object', type: 'output', dataType: 'object' },
    ],
  },
  {
    type: 'data-concat',
    category: 'data',
    label: 'Concat',
    icon: '🔗',
    color: '#EC4899',
    inputs: [
      { name: 'a', type: 'input', dataType: 'string' },
      { name: 'b', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'string' },
    ],
  },

  // Math Nodes
  {
    type: 'math-add',
    category: 'math',
    label: 'Add',
    icon: '+',
    color: '#6366F1',
    inputs: [
      { name: 'a', type: 'input', dataType: 'number' },
      { name: 'b', type: 'input', dataType: 'number' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'number' },
    ],
  },
  {
    type: 'math-subtract',
    category: 'math',
    label: 'Subtract',
    icon: '-',
    color: '#6366F1',
    inputs: [
      { name: 'a', type: 'input', dataType: 'number' },
      { name: 'b', type: 'input', dataType: 'number' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'number' },
    ],
  },
  {
    type: 'math-multiply',
    category: 'math',
    label: 'Multiply',
    icon: '×',
    color: '#6366F1',
    inputs: [
      { name: 'a', type: 'input', dataType: 'number' },
      { name: 'b', type: 'input', dataType: 'number' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'number' },
    ],
  },
  {
    type: 'math-divide',
    category: 'math',
    label: 'Divide',
    icon: '÷',
    color: '#6366F1',
    inputs: [
      { name: 'a', type: 'input', dataType: 'number' },
      { name: 'b', type: 'input', dataType: 'number' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'number' },
    ],
  },

  // Event Nodes
  {
    type: 'event-start',
    category: 'event',
    label: 'Start',
    icon: '▶️',
    color: '#EF4444',
    inputs: [],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
    ],
  },
  {
    type: 'event-custom',
    category: 'event',
    label: 'Custom Event',
    icon: '📣',
    color: '#EF4444',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
    ],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
      { name: 'data', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'eventName', type: 'string', default: 'myEvent' },
    ],
  },

  // Entity Nodes
  {
    type: 'entity-create',
    category: 'entity',
    label: 'Create Entity',
    icon: '🏗️',
    color: '#14B8A6',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
    ],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
      { name: 'instance', type: 'output', dataType: 'object' },
    ],
    properties: [
      { name: 'entityType', type: 'string', default: 'Entity' },
    ],
  },
  {
    type: 'entity-get-attr',
    category: 'entity',
    label: 'Get Attribute',
    icon: '📖',
    color: '#14B8A6',
    inputs: [
      { name: 'entity', type: 'input', dataType: 'object' },
    ],
    outputs: [
      { name: 'value', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'attribute', type: 'string', default: 'name' },
    ],
  },
  {
    type: 'entity-set-attr',
    category: 'entity',
    label: 'Set Attribute',
    icon: '✏️',
    color: '#14B8A6',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'entity', type: 'input', dataType: 'object' },
      { name: 'value', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
      { name: 'entity', type: 'output', dataType: 'object' },
    ],
    properties: [
      { name: 'attribute', type: 'string', default: 'name' },
    ],
  },
  {
    type: 'entity-method',
    category: 'entity',
    label: 'Call Method',
    icon: '⚙️',
    color: '#14B8A6',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'entity', type: 'input', dataType: 'object' },
      { name: 'args', type: 'input', dataType: 'array' },
    ],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
      { name: 'result', type: 'output', dataType: 'any' },
    ],
    properties: [
      { name: 'method', type: 'string', default: 'update' },
    ],
  },

  // Console / Debug
  {
    type: 'debug-log',
    category: 'logic',
    label: 'Console Log',
    icon: '🖥️',
    color: '#64748B',
    inputs: [
      { name: 'trigger', type: 'input', dataType: 'flow' },
      { name: 'message', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'flow', type: 'output', dataType: 'flow' },
    ],
  },

  // String Operations
  {
    type: 'string-includes',
    category: 'data',
    label: 'String Includes',
    icon: '🔍',
    color: '#EC4899',
    inputs: [
      { name: 'string', type: 'input', dataType: 'string' },
      { name: 'search', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'boolean' },
    ],
    properties: [
      { name: 'caseSensitive', type: 'boolean', default: false },
    ],
  },
  {
    type: 'string-lowercase',
    category: 'data',
    label: 'To Lowercase',
    icon: 'a',
    color: '#EC4899',
    inputs: [
      { name: 'string', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'string' },
    ],
  },

  // Array Operations
  {
    type: 'array-filter',
    category: 'data',
    label: 'Array Filter',
    icon: '🔍',
    color: '#EC4899',
    inputs: [
      { name: 'array', type: 'input', dataType: 'array' },
      { name: 'searchText', type: 'input', dataType: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'array' },
      { name: 'count', type: 'output', dataType: 'number' },
    ],
    properties: [
      { name: 'caseSensitive', type: 'boolean', default: false },
    ],
  },
  {
    type: 'array-push',
    category: 'data',
    label: 'Array Push',
    icon: '➕',
    color: '#EC4899',
    inputs: [
      { name: 'array', type: 'input', dataType: 'array' },
      { name: 'item', type: 'input', dataType: 'any' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'array' },
    ],
  },
  {
    type: 'array-map',
    category: 'data',
    label: 'Array Map',
    icon: '🗺️',
    color: '#EC4899',
    inputs: [
      { name: 'array', type: 'input', dataType: 'array' },
      { name: 'transform', type: 'input', dataType: 'flow' },
    ],
    outputs: [
      { name: 'result', type: 'output', dataType: 'array' },
      { name: 'item', type: 'output', dataType: 'any' },
      { name: 'index', type: 'output', dataType: 'number' },
    ],
  },
];

export const getNodeDefinition = (type: string): NodeDefinition | undefined => {
  return NODE_DEFINITIONS.find(def => def.type === type);
};

export const getNodesByCategory = (category: NodeCategory): NodeDefinition[] => {
  return NODE_DEFINITIONS.filter(def => def.category === category);
};
