// Parser complet pour analyser une arborescence de fichiers React/TypeScript

import { GraphNode, Connection, NODE_DEFINITIONS, Port } from '../types/nodes';
import { 
  ProjectFile, 
  ExtendedGraph, 
  NodeGroup, 
  NodeSourceInfo, 
  FileLink,
  ComponentInfo,
  ImportInfo,
  HookInfo,
  PropInfo
} from '../types/graph';

// Compteur global pour les IDs uniques
let nodeIdCounter = 0;
let connectionIdCounter = 0;
let groupIdCounter = 0;

const generateNodeId = (prefix: string = 'node') => `${prefix}_${++nodeIdCounter}`;
const generateConnectionId = () => `conn_${++connectionIdCounter}`;
const generateGroupId = () => `group_${++groupIdCounter}`;

// Réinitialiser les compteurs
export const resetCounters = () => {
  nodeIdCounter = 0;
  connectionIdCounter = 0;
  groupIdCounter = 0;
};

// Créer un nœud avec les ports basés sur la définition
const createNode = (
  type: string, 
  x: number, 
  y: number, 
  properties: Record<string, any> = {},
  sourceInfo?: NodeSourceInfo
): GraphNode & { sourceInfo?: NodeSourceInfo } => {
  const definition = NODE_DEFINITIONS.find(d => d.type === type);
  
  const nodeId = generateNodeId(type);
  
  const inputs: Port[] = definition?.inputs.map((input, index) => ({
    id: `${nodeId}_in_${index}`,
    name: input.name,
    type: 'input' as const,
    dataType: input.dataType,
    connected: false,
  })) || [];

  const outputs: Port[] = definition?.outputs.map((output, index) => ({
    id: `${nodeId}_out_${index}`,
    name: output.name,
    type: 'output' as const,
    dataType: output.dataType,
    connected: false,
  })) || [];

  return {
    id: nodeId,
    type,
    x,
    y,
    inputs,
    outputs,
    properties,
    sourceInfo,
  };
};

// Créer une connexion entre deux nœuds
const createConnection = (
  fromNodeId: string,
  fromPortIndex: number,
  toNodeId: string,
  toPortIndex: number
): Connection => {
  return {
    id: generateConnectionId(),
    fromNode: fromNodeId,
    fromPort: `${fromNodeId}_out_${fromPortIndex}`,
    toNode: toNodeId,
    toPort: `${toNodeId}_in_${toPortIndex}`,
  };
};

// Analyser les imports d'un fichier
const parseImports = (content: string): ImportInfo[] => {
  const imports: ImportInfo[] = [];
  const importRegex = /import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s*(?:from\s+)?['"]([^'"]+)['"]/g;
  const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  
  // Imports namespace
  while ((match = namespaceRegex.exec(content)) !== null) {
    imports.push({
      source: match[2],
      names: [match[1]],
      isDefault: false,
      isNamespace: true,
    });
  }
  
  // Imports normaux
  while ((match = importRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2]?.split(',').map(s => s.trim().split(' as ')[0].trim()).filter(Boolean) || [];
    const source = match[3];
    
    if (defaultImport) {
      imports.push({
        source,
        names: [defaultImport],
        isDefault: true,
        isNamespace: false,
      });
    }
    
    if (namedImports.length > 0) {
      imports.push({
        source,
        names: namedImports,
        isDefault: false,
        isNamespace: false,
      });
    }
  }
  
  return imports;
};

// Analyser les hooks d'un fichier
const parseHooks = (content: string): HookInfo[] => {
  const hooks: HookInfo[] = [];
  
  // useState
  const useStateRegex = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState(?:<[^>]+>)?\s*\(([^)]*)\)/g;
  let match;
  while ((match = useStateRegex.exec(content)) !== null) {
    hooks.push({
      type: 'useState',
      name: match[1],
      initialValue: match[2].trim() || 'undefined',
    });
  }
  
  // useEffect
  const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/g;
  while ((match = useEffectRegex.exec(content)) !== null) {
    hooks.push({
      type: 'useEffect',
      dependencies: match[1].split(',').map(s => s.trim()).filter(Boolean),
    });
  }
  
  // useMemo
  const useMemoRegex = /const\s+(\w+)\s*=\s*useMemo\s*\(\s*\(\)\s*=>\s*[\s\S]*?,\s*\[([^\]]*)\]\s*\)/g;
  while ((match = useMemoRegex.exec(content)) !== null) {
    hooks.push({
      type: 'useMemo',
      name: match[1],
      dependencies: match[2].split(',').map(s => s.trim()).filter(Boolean),
    });
  }
  
  // useRef
  const useRefRegex = /const\s+(\w+)\s*=\s*useRef(?:<[^>]+>)?\s*\(([^)]*)\)/g;
  while ((match = useRefRegex.exec(content)) !== null) {
    hooks.push({
      type: 'useRef',
      name: match[1],
      initialValue: match[2].trim() || 'null',
    });
  }
  
  // useCallback
  const useCallbackRegex = /const\s+(\w+)\s*=\s*useCallback\s*\(/g;
  while ((match = useCallbackRegex.exec(content)) !== null) {
    hooks.push({
      type: 'useCallback',
      name: match[1],
    });
  }
  
  return hooks;
};

// Analyser les props d'un composant
const parseProps = (content: string, componentName: string): PropInfo[] => {
  const props: PropInfo[] = [];
  
  // Chercher l'interface des props
  const interfaceRegex = new RegExp(`interface\\s+${componentName}Props\\s*\\{([^}]+)\\}`, 's');
  const match = interfaceRegex.exec(content);
  
  if (match) {
    const propsContent = match[1];
    const propRegex = /(\w+)(\?)?:\s*([^;]+)/g;
    let propMatch;
    while ((propMatch = propRegex.exec(propsContent)) !== null) {
      props.push({
        name: propMatch[1],
        type: propMatch[3].trim(),
        required: !propMatch[2],
      });
    }
  }
  
  return props;
};

// Analyser le JSX et créer les nœuds UI
interface JSXParseResult {
  nodes: (GraphNode & { sourceInfo?: NodeSourceInfo })[];
  connections: Connection[];
  rootNodeId?: string;
}

const parseJSX = (
  content: string, 
  filePath: string,
  startX: number, 
  startY: number,
  stateMap: Map<string, string> // Map de nom de state -> nodeId
): JSXParseResult => {
  const nodes: (GraphNode & { sourceInfo?: NodeSourceInfo })[] = [];
  const connections: Connection[] = [];
  
  // Extraire le return du composant
  const returnMatch = /return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/.exec(content) ||
                      /return\s+([\s\S]*?);?\s*\}/.exec(content);
  
  if (!returnMatch) {
    return { nodes, connections };
  }
  
  const jsxContent = returnMatch[1];
  let currentY = startY;
  let currentX = startX;
  
  // Parser les éléments JSX
  const elementRegex = /<(\w+)([^>]*?)(?:\/>|>([^<]*(?:<(?!\/\1)[^<]*)*)<\/\1>)/gs;
  let match;
  let lastNodeId: string | undefined;
  let rootNodeId: string | undefined;
  
  const processElement = (tag: string, attrs: string, _children: string, depth: number) => {
    let nodeType: string;
    const properties: Record<string, any> = {};
    
    // Déterminer le type de nœud
    switch (tag.toLowerCase()) {
      case 'div':
      case 'section':
      case 'article':
      case 'main':
      case 'header':
      case 'footer':
      case 'nav':
        nodeType = 'ui-container';
        // Extraire le layout depuis className
        if (attrs.includes('flex-row') || attrs.includes('flex row')) {
          properties.layout = 'flex-row';
        } else if (attrs.includes('grid')) {
          properties.layout = 'grid';
        } else {
          properties.layout = 'flex-col';
        }
        break;
      case 'button':
        nodeType = 'ui-button';
        const labelMatch = />(.*?)</.exec(_children || '');
        if (labelMatch) properties.label = labelMatch[1].trim();
        break;
      case 'input':
        nodeType = 'ui-input';
        const placeholderMatch = /placeholder=["']([^"']+)["']/.exec(attrs);
        if (placeholderMatch) properties.placeholder = placeholderMatch[1];
        const typeMatch = /type=["']([^"']+)["']/.exec(attrs);
        if (typeMatch) properties.inputType = typeMatch[1];
        break;
      case 'p':
      case 'span':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'label':
        nodeType = 'ui-text';
        properties.tag = tag.toLowerCase();
        // Extraire le contenu
        if (_children) {
          const textContent = _children.replace(/<[^>]+>/g, '').trim();
          if (textContent && !textContent.startsWith('{')) {
            properties.content = textContent;
          }
        }
        break;
      case 'img':
        nodeType = 'ui-image';
        const srcMatch = /src=["']([^"']+)["']/.exec(attrs);
        if (srcMatch) properties.src = srcMatch[1];
        const altMatch = /alt=["']([^"']+)["']/.exec(attrs);
        if (altMatch) properties.alt = altMatch[1];
        break;
      case 'ul':
      case 'ol':
        nodeType = 'ui-list';
        break;
      default:
        // Composant personnalisé ou inconnu
        nodeType = 'ui-container';
        properties.customTag = tag;
    }
    
    // Calculer la position
    const nodeX = currentX + depth * 50;
    const nodeY = currentY;
    currentY += 100;
    
    // Trouver le numéro de ligne approximatif
    const lineMatch = content.substring(0, content.indexOf(`<${tag}`)).split('\n');
    const lineNumber = lineMatch.length;
    
    const sourceInfo: NodeSourceInfo = {
      filePath,
      fileName: filePath.split('/').pop() || filePath,
      lineStart: lineNumber,
      lineEnd: lineNumber + (_children?.split('\n').length || 1),
      codeSnippet: `<${tag}${attrs.substring(0, 50)}...`,
    };
    
    const node = createNode(nodeType, nodeX, nodeY, properties, sourceInfo);
    nodes.push(node);
    
    if (!rootNodeId) {
      rootNodeId = node.id;
    }
    
    // Analyser les attributs pour les connexions
    // onChange -> connecter au setState
    const onChangeMatch = /onChange=\{(?:\([^)]*\)\s*=>)?\s*set(\w+)/i.exec(attrs);
    if (onChangeMatch) {
      const stateName = onChangeMatch[1].toLowerCase();
      // Chercher le state correspondant
      stateMap.forEach((stateNodeId, name) => {
        if (name.toLowerCase() === stateName || name.toLowerCase().includes(stateName)) {
          // Connecter onChange (output 0) vers setValue du state
          connections.push(createConnection(node.id, 0, stateNodeId, 0));
        }
      });
    }
    
    // value -> connecter depuis le state
    const valueMatch = /value=\{(\w+)\}/.exec(attrs);
    if (valueMatch) {
      const stateName = valueMatch[1];
      stateMap.forEach((stateNodeId, name) => {
        if (name === stateName) {
          // Connecter value du state (output 0) vers value de l'input (input 2)
          connections.push(createConnection(stateNodeId, 0, node.id, 2));
        }
      });
    }
    
    // onClick -> analyser l'action
    const onClickMatch = /onClick=\{[^}]*\}/.exec(attrs);
    if (onClickMatch && nodeType === 'ui-button') {
      // Marquer qu'il y a un onClick
      properties.hasOnClick = true;
    }
    
    // Connecter au nœud parent (container)
    if (lastNodeId && depth > 0) {
      // Le container parent a un port children (input 1)
      // connections.push(createConnection(lastNodeId, 0, node.id, 0));
    }
    
    return node.id;
  };
  
  // Parser récursivement
  let depth = 0;
  while ((match = elementRegex.exec(jsxContent)) !== null) {
    const [, tag, attrs, children] = match;
    const nodeId = processElement(tag, attrs || '', children || '', depth);
    lastNodeId = nodeId;
    
    // Compter la profondeur approximative
    const openTags = (match[0].match(/<\w/g) || []).length;
    const closeTags = (match[0].match(/<\//g) || []).length;
    depth += openTags - closeTags;
    if (depth < 0) depth = 0;
  }
  
  return { nodes, connections, rootNodeId };
};

// Analyser un fichier complet
export interface FileParseResult {
  graph: ExtendedGraph;
  componentInfo: ComponentInfo;
  imports: ImportInfo[];
}

export const parseFile = (file: ProjectFile): FileParseResult | null => {
  if (!file.content || file.type === 'folder') return null;
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['tsx', 'jsx', 'ts', 'js'].includes(ext || '')) return null;
  
  resetCounters();
  
  const content = file.content;
  const nodes: (GraphNode & { sourceInfo?: NodeSourceInfo })[] = [];
  const connections: Connection[] = [];
  const groups: NodeGroup[] = [];
  
  // Analyser les imports
  const imports = parseImports(content);
  
  // Trouver le nom du composant
  const componentMatch = /(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/.exec(content);
  const componentName = componentMatch?.[1] || 'Component';
  
  // Analyser les hooks
  const hooks = parseHooks(content);
  
  // Analyser les props
  const props = parseProps(content, componentName);
  
  // Créer le nœud Start
  let currentY = 50;
  const startNode = createNode('event-start', 50, currentY, {}, {
    filePath: file.path,
    fileName: file.name,
    lineStart: 1,
    lineEnd: 1,
  });
  nodes.push(startNode);
  currentY += 100;
  
  // Map pour tracker les states
  const stateMap = new Map<string, string>();
  
  // Créer les nœuds pour les hooks
  const hookNodes: string[] = [];
  
  hooks.forEach((hook, index) => {
    let nodeType: string;
    const properties: Record<string, any> = {};
    
    switch (hook.type) {
      case 'useState':
        nodeType = 'hook-useState';
        properties.name = hook.name;
        // Parser la valeur initiale
        if (hook.initialValue) {
          try {
            properties.initialValue = JSON.parse(hook.initialValue);
          } catch {
            properties.initialValue = hook.initialValue;
          }
        }
        break;
      case 'useEffect':
        nodeType = 'hook-useEffect';
        properties.deps = hook.dependencies?.join(', ');
        break;
      case 'useMemo':
        nodeType = 'hook-useMemo';
        properties.name = hook.name;
        properties.deps = hook.dependencies?.join(', ');
        break;
      case 'useRef':
        nodeType = 'hook-useRef';
        properties.name = hook.name;
        properties.initialValue = hook.initialValue;
        break;
      case 'useCallback':
        nodeType = 'hook-useCallback';
        properties.name = hook.name;
        break;
      default:
        return;
    }
    
    // Trouver la ligne du hook
    const hookRegex = new RegExp(`(use${hook.type.replace('use', '')})`);
    const hookMatch = hookRegex.exec(content);
    const linesBefore = content.substring(0, hookMatch?.index || 0).split('\n');
    const lineNumber = linesBefore.length;
    
    const sourceInfo: NodeSourceInfo = {
      filePath: file.path,
      fileName: file.name,
      lineStart: lineNumber,
      lineEnd: lineNumber,
      codeSnippet: `const [${hook.name}] = useState(...)`,
    };
    
    const node = createNode(nodeType, 250, currentY, properties, sourceInfo);
    nodes.push(node);
    hookNodes.push(node.id);
    
    if (hook.type === 'useState' && hook.name) {
      stateMap.set(hook.name, node.id);
    }
    
    // Connecter au start ou au hook précédent
    if (index === 0) {
      connections.push(createConnection(startNode.id, 0, node.id, 0));
    }
    
    currentY += 100;
  });
  
  // Créer un groupe pour les hooks
  if (hookNodes.length > 0) {
    groups.push({
      id: generateGroupId(),
      name: 'Hooks',
      nodeIds: hookNodes,
      collapsed: false,
      color: '#8B5CF6',
      sourceInfo: {
        filePath: file.path,
        fileName: file.name,
        lineStart: 1,
        lineEnd: 1,
      },
    });
  }
  
  // Parser le JSX
  const jsxResult = parseJSX(content, file.path, 450, 50, stateMap);
  nodes.push(...jsxResult.nodes);
  connections.push(...jsxResult.connections);
  
  // Créer un groupe pour l'UI
  if (jsxResult.nodes.length > 0) {
    groups.push({
      id: generateGroupId(),
      name: 'UI',
      nodeIds: jsxResult.nodes.map(n => n.id),
      collapsed: false,
      color: '#3B82F6',
      sourceInfo: {
        filePath: file.path,
        fileName: file.name,
        lineStart: 1,
        lineEnd: 1,
      },
    });
  }
  
  // Connecter le dernier hook à la racine UI
  if (hookNodes.length > 0 && jsxResult.rootNodeId) {
    connections.push(createConnection(hookNodes[hookNodes.length - 1], 0, jsxResult.rootNodeId, 0));
  } else if (jsxResult.rootNodeId) {
    connections.push(createConnection(startNode.id, 0, jsxResult.rootNodeId, 0));
  }
  
  const graph: ExtendedGraph = {
    id: `graph_${file.id}`,
    name: componentName,
    nodes: nodes as any,
    connections,
    groups,
    sourceFileId: file.id,
  };
  
  const componentInfo: ComponentInfo = {
    name: componentName,
    filePath: file.path,
    props,
    hooks,
    exports: [componentName],
    imports,
  };
  
  return { graph, componentInfo, imports };
};

// Analyser une arborescence complète de fichiers
export const parseProject = (files: ProjectFile[]): {
  graphs: ExtendedGraph[];
  fileLinks: FileLink[];
  components: ComponentInfo[];
} => {
  const graphs: ExtendedGraph[] = [];
  const fileLinks: FileLink[] = [];
  const components: ComponentInfo[] = [];
  const fileComponentMap = new Map<string, string>(); // path -> componentName
  
  // Fonction récursive pour parcourir les fichiers
  const processFiles = (fileList: ProjectFile[]) => {
    fileList.forEach(file => {
      if (file.type === 'folder' && file.children) {
        processFiles(file.children);
      } else if (file.type === 'file') {
        const result = parseFile(file);
        if (result) {
          graphs.push(result.graph);
          components.push(result.componentInfo);
          fileComponentMap.set(file.path, result.componentInfo.name);
          
          // Créer les liens entre fichiers basés sur les imports
          result.imports.forEach(imp => {
            // Résoudre le chemin relatif
            if (imp.source.startsWith('.')) {
              const basePath = file.path.split('/').slice(0, -1).join('/');
              let resolvedPath = imp.source;
              
              if (imp.source.startsWith('./')) {
                resolvedPath = `${basePath}/${imp.source.slice(2)}`;
              } else if (imp.source.startsWith('../')) {
                const parts = basePath.split('/');
                const levels = (imp.source.match(/\.\.\//g) || []).length;
                resolvedPath = [...parts.slice(0, -levels), imp.source.replace(/\.\.\//g, '')].join('/');
              }
              
              // Ajouter les extensions possibles
              const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
              for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (fileComponentMap.has(fullPath)) {
                  fileLinks.push({
                    id: `link_${file.id}_${fullPath}`,
                    fromFileId: file.id,
                    toFileId: fullPath,
                    importName: imp.names.join(', '),
                    exportName: fileComponentMap.get(fullPath) || '',
                  });
                  break;
                }
              }
            }
          });
        }
      }
    });
  };
  
  processFiles(files);
  
  return { graphs, fileLinks, components };
};

// Factoriser un groupe de nœuds en un sous-graphe
export const factorizeNodes = (
  graph: ExtendedGraph,
  nodeIds: string[],
  groupName: string
): { updatedGraph: ExtendedGraph; newGroup: NodeGroup } => {
  const nodes = graph.nodes.filter(n => nodeIds.includes(n.id));
  
  // Trouver les connexions entrantes et sortantes du groupe
  const inputConnections = graph.connections.filter(
    c => !nodeIds.includes(c.fromNode) && nodeIds.includes(c.toNode)
  );
  
  const outputConnections = graph.connections.filter(
    c => nodeIds.includes(c.fromNode) && !nodeIds.includes(c.toNode)
  );
  
  // Déterminer le port d'entrée et de sortie du groupe
  const inputPortId = inputConnections[0]?.toPort;
  const outputPortId = outputConnections[0]?.fromPort;
  
  // Créer le groupe
  const newGroup: NodeGroup = {
    id: generateGroupId(),
    name: groupName,
    nodeIds,
    collapsed: false,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    inputPortId,
    outputPortId,
    sourceInfo: nodes[0]?.sourceInfo,
  };
  
  // Mettre à jour les nœuds avec le groupId
  const updatedNodes = graph.nodes.map(node => {
    if (nodeIds.includes(node.id)) {
      return { ...node, groupId: newGroup.id };
    }
    return node;
  });
  
  const updatedGraph: ExtendedGraph = {
    ...graph,
    nodes: updatedNodes as any,
    groups: [...graph.groups, newGroup],
  };
  
  return { updatedGraph, newGroup };
};

// Replier/déplier un groupe
export const toggleGroupCollapse = (
  graph: ExtendedGraph,
  groupId: string
): ExtendedGraph => {
  const updatedGroups = graph.groups.map(group => {
    if (group.id === groupId) {
      return { ...group, collapsed: !group.collapsed };
    }
    return group;
  });
  
  // Mettre à jour la visibilité des nœuds
  const collapsedGroup = updatedGroups.find(g => g.id === groupId);
  const updatedNodes = graph.nodes.map(node => {
    if (collapsedGroup?.nodeIds.includes(node.id)) {
      return { ...node, collapsed: collapsedGroup.collapsed };
    }
    return node;
  });
  
  return {
    ...graph,
    nodes: updatedNodes as any,
    groups: updatedGroups,
  };
};

// Déplier un groupe et afficher ses nœuds pas à pas
export const expandGroupStep = (
  graph: ExtendedGraph,
  groupId: string,
  step: number
): ExtendedGraph => {
  const group = graph.groups.find(g => g.id === groupId);
  if (!group) return graph;
  
  const visibleNodeIds = group.nodeIds.slice(0, step);
  
  const updatedNodes = graph.nodes.map(node => {
    if (group.nodeIds.includes(node.id)) {
      return { ...node, collapsed: !visibleNodeIds.includes(node.id) };
    }
    return node;
  });
  
  return {
    ...graph,
    nodes: updatedNodes as any,
  };
};
