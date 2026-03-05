// Parser TypeScript/React vers Graph de nœuds
import { GraphNode, Connection, Graph, getNodeDefinition, Port } from '../types/nodes';

interface ParsedHook {
  type: 'useState' | 'useEffect' | 'useMemo' | 'useRef' | 'useCallback';
  name: string;
  initialValue?: string;
  dependencies?: string[];
}

interface ParsedJSXElement {
  tag: string;
  props: Record<string, string>;
  children: ParsedJSXElement[];
  textContent?: string;
}

// Génère un ID unique
const generateId = (): string => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Parse les hooks React
function parseHooks(code: string): ParsedHook[] {
  const hooks: ParsedHook[] = [];
  
  // useState
  const useStateRegex = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState(?:<[^>]+>)?\s*\(([^)]*)\)/g;
  let match;
  while ((match = useStateRegex.exec(code)) !== null) {
    hooks.push({
      type: 'useState',
      name: match[1],
      initialValue: match[2].trim() || '""'
    });
  }
  
  // useEffect
  const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/g;
  while ((match = useEffectRegex.exec(code)) !== null) {
    hooks.push({
      type: 'useEffect',
      name: `effect_${hooks.filter(h => h.type === 'useEffect').length + 1}`,
      dependencies: match[1].split(',').map(d => d.trim()).filter(Boolean)
    });
  }
  
  // useMemo
  const useMemoRegex = /const\s+(\w+)\s*=\s*useMemo\s*\(\s*\(\)\s*=>\s*[\s\S]*?,\s*\[([^\]]*)\]\s*\)/g;
  while ((match = useMemoRegex.exec(code)) !== null) {
    hooks.push({
      type: 'useMemo',
      name: match[1],
      dependencies: match[2].split(',').map(d => d.trim()).filter(Boolean)
    });
  }
  
  // useRef
  const useRefRegex = /const\s+(\w+)\s*=\s*useRef(?:<[^>]+>)?\s*\(([^)]*)\)/g;
  while ((match = useRefRegex.exec(code)) !== null) {
    hooks.push({
      type: 'useRef',
      name: match[1],
      initialValue: match[2].trim() || 'null'
    });
  }
  
  return hooks;
}

// Parse le JSX simplifié
function parseJSXSimple(code: string): ParsedJSXElement[] {
  const elements: ParsedJSXElement[] = [];
  
  // Trouve le return statement
  const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}?\s*$/);
  if (!returnMatch) return elements;
  
  const jsxCode = returnMatch[1].trim();
  
  // Parse basique des éléments
  const tagRegex = /<(\w+)([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let tagMatch;
  
  while ((tagMatch = tagRegex.exec(jsxCode)) !== null) {
    const [, tag, propsStr, content] = tagMatch;
    
    const props: Record<string, string> = {};
    
    // Parse className
    const classMatch = propsStr.match(/className=["']([^"']+)["']/);
    if (classMatch) props.className = classMatch[1];
    
    // Parse onClick
    const onClickMatch = propsStr.match(/onClick=\{([^}]+)\}/);
    if (onClickMatch) props.onClick = onClickMatch[1];
    
    // Parse value
    const valueMatch = propsStr.match(/value=\{([^}]+)\}/);
    if (valueMatch) props.value = valueMatch[1];
    
    // Parse placeholder
    const placeholderMatch = propsStr.match(/placeholder=["']([^"']+)["']/);
    if (placeholderMatch) props.placeholder = placeholderMatch[1];
    
    elements.push({
      tag,
      props,
      children: [],
      textContent: content?.trim()
    });
  }
  
  return elements;
}

// Parse le nom du composant
function parseComponentName(code: string): string {
  const funcMatch = code.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/);
  if (funcMatch) return funcMatch[1];
  
  const arrowMatch = code.match(/(?:export\s+)?(?:const|let)\s+(\w+)\s*[=:]/);
  if (arrowMatch) return arrowMatch[1];
  
  return 'Component';
}

// Convertit un tag JSX en type de nœud
function tagToNodeType(tag: string): string {
  const mapping: Record<string, string> = {
    'div': 'ui-container',
    'section': 'ui-container',
    'article': 'ui-container',
    'main': 'ui-container',
    'header': 'ui-container',
    'footer': 'ui-container',
    'span': 'ui-text',
    'p': 'ui-text',
    'h1': 'ui-text',
    'h2': 'ui-text',
    'h3': 'ui-text',
    'h4': 'ui-text',
    'button': 'ui-button',
    'input': 'ui-input',
    'textarea': 'ui-input',
    'img': 'ui-image',
    'ul': 'ui-list',
    'ol': 'ui-list',
  };
  
  return mapping[tag.toLowerCase()] || 'ui-container';
}

// Crée un nœud avec la bonne structure
function createNode(type: string, x: number, y: number, properties: Record<string, unknown> = {}): GraphNode | null {
  const def = getNodeDefinition(type);
  if (!def) return null;
  
  const nodeId = generateId();
  
  const inputs: Port[] = def.inputs.map((input, i) => ({
    id: `${nodeId}_in_${i}`,
    name: input.name,
    type: 'input' as const,
    dataType: input.dataType,
    connected: false,
  }));
  
  const outputs: Port[] = def.outputs.map((output, i) => ({
    id: `${nodeId}_out_${i}`,
    name: output.name,
    type: 'output' as const,
    dataType: output.dataType,
    connected: false,
  }));
  
  return {
    id: nodeId,
    type,
    x,
    y,
    inputs,
    outputs,
    properties,
  };
}

// Parse un fichier TypeScript/React et génère un graphe
export function parseTypeScriptToGraph(code: string, fileName: string): { 
  graph: Graph; 
  connections: Connection[];
} {
  const componentName = parseComponentName(code);
  const hooks = parseHooks(code);
  const jsxElements = parseJSXSimple(code);
  
  const nodes: GraphNode[] = [];
  const connections: Connection[] = [];
  
  let x = 100;
  let y = 100;
  const spacingX = 280;
  const spacingY = 120;
  
  // Map pour les variables
  const variableNodes: Record<string, GraphNode> = {};
  
  // Nœud Start
  const startNode = createNode('event-start', x, y);
  if (startNode) {
    nodes.push(startNode);
  }
  
  let lastFlowNode = startNode;
  y += spacingY;
  
  // Créer les nœuds pour les hooks
  for (const hook of hooks) {
    let node: GraphNode | null = null;
    
    if (hook.type === 'useState') {
      node = createNode('hook-useState', x, y, {
        name: hook.name,
        initialValue: hook.initialValue || ''
      });
      if (node) {
        variableNodes[hook.name] = node;
        const setterName = `set${hook.name.charAt(0).toUpperCase()}${hook.name.slice(1)}`;
        variableNodes[setterName] = node;
      }
    } else if (hook.type === 'useEffect') {
      node = createNode('hook-useEffect', x, y, {
        dependencies: hook.dependencies?.join(', ') || ''
      });
    } else if (hook.type === 'useMemo') {
      node = createNode('hook-useMemo', x, y, {
        name: hook.name,
        dependencies: hook.dependencies?.join(', ') || ''
      });
      if (node) {
        variableNodes[hook.name] = node;
      }
    } else if (hook.type === 'useRef') {
      node = createNode('hook-useRef', x, y, {
        name: hook.name,
        initialValue: hook.initialValue || 'null'
      });
      if (node) {
        variableNodes[hook.name] = node;
      }
    }
    
    if (node) {
      nodes.push(node);
      y += spacingY;
    }
  }
  
  // Créer les nœuds UI à partir du JSX
  let uiX = x + spacingX;
  let uiY = 100;
  
  for (const element of jsxElements) {
    const nodeType = tagToNodeType(element.tag);
    const properties: Record<string, unknown> = {};
    
    // Configurer les propriétés selon le type
    if (nodeType === 'ui-container') {
      properties.layout = element.props.className?.includes('flex-col') ? 'flex-col' : 'flex-row';
    } else if (nodeType === 'ui-text') {
      properties.content = element.textContent || 'Text';
      properties.tag = element.tag.startsWith('h') ? element.tag : 'p';
    } else if (nodeType === 'ui-button') {
      properties.label = element.textContent || 'Button';
      properties.variant = 'primary';
    } else if (nodeType === 'ui-input') {
      properties.placeholder = element.props.placeholder || '';
    }
    
    const node = createNode(nodeType, uiX, uiY, properties);
    
    if (node) {
      nodes.push(node);
      
      // Connecter le flow depuis le start ou dernier nœud
      if (lastFlowNode && nodes.indexOf(node) === (hooks.length + 1)) {
        connections.push({
          id: generateId(),
          fromNode: lastFlowNode.id,
          fromPort: `${lastFlowNode.id}_out_0`,
          toNode: node.id,
          toPort: `${node.id}_in_0`
        });
      }
      
      // Connecter les expressions JSX aux états
      if (element.textContent?.startsWith('{') && element.textContent.endsWith('}')) {
        const varName = element.textContent.slice(1, -1).trim();
        const sourceNode = variableNodes[varName];
        if (sourceNode) {
          const valuePortIndex = sourceNode.outputs.findIndex((o: Port) => o.name === 'value');
          const inputPortIndex = node.inputs.findIndex((i: Port) => i.name === 'content' || i.name === 'value');
          
          if (valuePortIndex >= 0 && inputPortIndex >= 0) {
            connections.push({
              id: generateId(),
              fromNode: sourceNode.id,
              fromPort: `${sourceNode.id}_out_${valuePortIndex}`,
              toNode: node.id,
              toPort: `${node.id}_in_${inputPortIndex}`
            });
          }
        }
      }
      
      // Connecter onClick
      if (element.props.onClick) {
        const setterMatch = element.props.onClick.match(/set(\w+)/);
        if (setterMatch) {
          const setterName = `set${setterMatch[1]}`;
          const stateNode = variableNodes[setterName];
          if (stateNode) {
            const flowOutIndex = node.outputs.findIndex((o: Port) => o.dataType === 'flow');
            if (flowOutIndex >= 0) {
              connections.push({
                id: generateId(),
                fromNode: node.id,
                fromPort: `${node.id}_out_${flowOutIndex}`,
                toNode: stateNode.id,
                toPort: `${stateNode.id}_in_0`
              });
            }
          }
        }
      }
      
      uiY += spacingY;
    }
  }
  
  const graph: Graph = {
    id: generateId(),
    name: componentName || fileName.replace(/\.(tsx?|jsx?)$/, ''),
    nodes,
    connections: []
  };
  
  return { graph, connections };
}

// Analyse un fichier et retourne des infos résumées
export function analyzeFile(code: string): {
  componentName: string;
  hooks: { type: string; name: string }[];
  hasJSX: boolean;
  linesOfCode: number;
} {
  const componentName = parseComponentName(code);
  const hooks = parseHooks(code).map(h => ({ type: h.type, name: h.name }));
  const hasJSX = /return\s*\([\s\S]*</.test(code);
  const linesOfCode = code.split('\n').length;
  
  return { componentName, hooks, hasJSX, linesOfCode };
}
