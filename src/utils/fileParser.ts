// Parser pour analyser les fichiers React/TypeScript et extraire les informations

import { ParsedComponent, ImportAnalysis } from '../types/project';
import { NodeDefinition, PortDefinition } from '../types/nodes';

// Regex patterns pour parser le code
const IMPORT_REGEX = /import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{\s*([^}]+)\s*\})?(?:\s*\*\s+as\s+(\w+))?\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+(?:function\s+)?(\w+)/;
const EXPORT_NAMED_REGEX = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
const USESTATE_REGEX = /const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState(?:<([^>]+)>)?\(([^)]*)\)/g;
const USEEFFECT_REGEX = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/g;
const USEMEMO_REGEX = /const\s+(\w+)\s*=\s*useMemo\s*\(\s*\(\)\s*=>\s*[\s\S]*?,\s*\[([^\]]*)\]\s*\)/g;
const USEREF_REGEX = /const\s+(\w+)\s*=\s*useRef(?:<([^>]+)>)?\(([^)]*)\)/g;
const PROPS_REGEX = /(?:interface|type)\s+(\w+Props)\s*(?:=\s*)?\{([^}]+)\}/;
const FUNCTION_COMPONENT_REGEX = /(?:const|function)\s+(\w+)\s*(?::\s*React\.FC(?:<[^>]+>)?)?.*?=.*?\((?:props)?:?\s*(\w+)?\)/;

export function parseImports(code: string): ImportAnalysis['imports'] {
  const imports: ImportAnalysis['imports'] = [];
  let match;
  
  while ((match = IMPORT_REGEX.exec(code)) !== null) {
    const [, defaultImport, namedImports, namespaceImport, source] = match;
    const specifiers: ImportAnalysis['imports'][0]['specifiers'] = [];
    
    if (defaultImport) {
      specifiers.push({ name: defaultImport, type: 'default' });
    }
    
    if (namedImports) {
      namedImports.split(',').forEach(spec => {
        const parts = spec.trim().split(/\s+as\s+/);
        specifiers.push({
          name: parts[0].trim(),
          alias: parts[1]?.trim(),
          type: 'named'
        });
      });
    }
    
    if (namespaceImport) {
      specifiers.push({ name: namespaceImport, type: 'namespace' });
    }
    
    imports.push({ source, specifiers });
  }
  
  return imports;
}

export function parseExports(code: string): ImportAnalysis['exports'] {
  const exports: ImportAnalysis['exports'] = [];
  
  const defaultMatch = EXPORT_DEFAULT_REGEX.exec(code);
  if (defaultMatch) {
    exports.push({ name: defaultMatch[1], type: 'default' });
  }
  
  let namedMatch;
  while ((namedMatch = EXPORT_NAMED_REGEX.exec(code)) !== null) {
    exports.push({ name: namedMatch[1], type: 'named' });
  }
  
  return exports;
}

export function parseComponent(code: string, fileName: string): ParsedComponent | null {
  // Trouver le nom du composant
  const funcMatch = FUNCTION_COMPONENT_REGEX.exec(code);
  const componentName = funcMatch?.[1] || fileName.replace(/\.(tsx?|jsx?)$/, '');
  
  // Parser les props
  const props: ParsedComponent['props'] = [];
  const propsMatch = PROPS_REGEX.exec(code);
  if (propsMatch) {
    const propsContent = propsMatch[2];
    propsContent.split(';').forEach(prop => {
      const propMatch = prop.trim().match(/(\w+)(\?)?:\s*(.+)/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          type: propMatch[3].trim(),
          required: !propMatch[2]
        });
      }
    });
  }
  
  // Parser les states
  const states: ParsedComponent['states'] = [];
  let stateMatch;
  while ((stateMatch = USESTATE_REGEX.exec(code)) !== null) {
    let initialValue: unknown = stateMatch[4];
    try {
      initialValue = JSON.parse(stateMatch[4] || 'null');
    } catch {
      // Garder la valeur comme string si pas JSON valide
    }
    states.push({
      name: stateMatch[1],
      type: stateMatch[3] || 'any',
      initialValue
    });
  }
  
  // Parser les effects
  const effects: ParsedComponent['effects'] = [];
  let effectMatch;
  while ((effectMatch = USEEFFECT_REGEX.exec(code)) !== null) {
    effects.push({
      dependencies: effectMatch[1] ? effectMatch[1].split(',').map(d => d.trim()).filter(Boolean) : [],
      hasCleanup: code.includes('return () =>')
    });
  }
  
  // Parser les memos
  const memos: ParsedComponent['memos'] = [];
  let memoMatch;
  while ((memoMatch = USEMEMO_REGEX.exec(code)) !== null) {
    memos.push({
      dependencies: memoMatch[2] ? memoMatch[2].split(',').map(d => d.trim()).filter(Boolean) : []
    });
  }
  
  // Parser les refs
  const refs: ParsedComponent['refs'] = [];
  let refMatch;
  while ((refMatch = USEREF_REGEX.exec(code)) !== null) {
    refs.push({
      name: refMatch[1],
      type: refMatch[2] || 'any'
    });
  }
  
  // Parser les imports
  const imports = parseImports(code).map(imp => ({
    from: imp.source,
    names: imp.specifiers.map(s => s.name)
  }));
  
  // Extraire le JSX (simplifié)
  const jsxMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}?\s*;?\s*$/);
  const jsx = jsxMatch?.[1] || '';
  
  return {
    name: componentName,
    type: 'functional',
    props,
    states,
    effects,
    memos,
    refs,
    imports,
    jsx
  };
}

// Convertir un composant parsé en nœuds de graph
export function componentToNodes(
  component: ParsedComponent,
  startX: number = 100,
  startY: number = 100
): { nodes: { id: string; type: string; position: { x: number; y: number }; properties: Record<string, unknown> }[], connections: { fromNode: string; fromPortIndex: number; toNode: string; toPortIndex: number }[] } {
  const nodes: { id: string; type: string; position: { x: number; y: number }; properties: Record<string, unknown> }[] = [];
  const connections: { fromNode: string; fromPortIndex: number; toNode: string; toPortIndex: number }[] = [];
  const nodeSpacingY = 120;
  const nodeSpacingX = 250;
  
  // Nœud Start
  const startNode = {
    id: `start_${Date.now()}`,
    type: 'event-start',
    position: { x: startX, y: startY },
    properties: { label: component.name }
  };
  nodes.push(startNode);
  
  // Nœuds pour les states
  component.states.forEach((state, index) => {
    const stateNode = {
      id: `state_${state.name}_${Date.now()}`,
      type: 'hook-useState',
      position: { x: startX + nodeSpacingX, y: startY + index * nodeSpacingY },
      properties: {
        label: `State: ${state.name}`,
        name: state.name,
        initialValue: JSON.stringify(state.initialValue)
      }
    };
    nodes.push(stateNode);
    
    // Connexion du start vers le state
    connections.push({
      fromNode: startNode.id,
      fromPortIndex: 0,
      toNode: stateNode.id,
      toPortIndex: 0
    });
  });
  
  // Nœuds pour les refs
  component.refs.forEach((ref, index) => {
    const refNode = {
      id: `ref_${ref.name}_${Date.now()}`,
      type: 'hook-useRef',
      position: { x: startX + nodeSpacingX * 2, y: startY + index * nodeSpacingY },
      properties: {
        label: `Ref: ${ref.name}`,
        name: ref.name
      }
    };
    nodes.push(refNode);
  });
  
  // Nœuds pour les effects
  component.effects.forEach((effect, index) => {
    const effectNode = {
      id: `effect_${index}_${Date.now()}`,
      type: 'hook-useEffect',
      position: { x: startX + nodeSpacingX * 3, y: startY + index * nodeSpacingY },
      properties: {
        label: `Effect ${index + 1}`,
        dependencies: effect.dependencies.join(', ')
      }
    };
    nodes.push(effectNode);
  });
  
  return { nodes, connections };
}

// Analyser un fichier et retourner les informations
export function analyzeFile(content: string, filePath: string): ImportAnalysis {
  return {
    filePath,
    imports: parseImports(content),
    exports: parseExports(content)
  };
}

// Créer un nœud personnalisé à partir d'un composant
export function createNodeFromComponent(component: ParsedComponent): NodeDefinition {
  const inputs: Omit<PortDefinition, 'id'>[] = [
    { name: 'flow', type: 'flow' }
  ];
  
  const outputs: Omit<PortDefinition, 'id'>[] = [
    { name: 'element', type: 'any' }
  ];
  
  // Ajouter les props comme inputs
  component.props.forEach(prop => {
    let portType: PortDefinition['type'] = 'any';
    if (prop.type.includes('string')) portType = 'string';
    else if (prop.type.includes('number')) portType = 'number';
    else if (prop.type.includes('boolean')) portType = 'boolean';
    else if (prop.type.includes('[]')) portType = 'array';
    
    inputs.push({
      name: prop.name + (prop.required ? '*' : ''),
      type: portType
    });
  });
  
  return {
    type: `custom-${component.name.toLowerCase()}`,
    category: 'custom',
    label: component.name,
    icon: '🧩',
    color: '#9333EA',
    inputs: inputs.map(p => ({ name: p.name, type: 'input' as const, dataType: p.type })),
    outputs: outputs.map(p => ({ name: p.name, type: 'output' as const, dataType: p.type })),
    properties: [
      { name: 'label', type: 'string', default: component.name }
    ]
  };
}
