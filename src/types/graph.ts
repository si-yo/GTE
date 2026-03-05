// Types étendus pour le graphe avec support de factorisation et traçabilité

export interface NodeSourceInfo {
  filePath: string;
  fileName: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet?: string;
}

export interface NodeGroup {
  id: string;
  name: string;
  nodeIds: string[];
  collapsed: boolean;
  color: string;
  inputPortId?: string;  // Le port d'entrée qui déclenche ce groupe
  outputPortId?: string; // Le port de sortie du groupe
  parentGroupId?: string; // Pour les groupes imbriqués
  sourceInfo?: NodeSourceInfo;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  children?: ProjectFile[];
  parsed?: boolean;
  graphId?: string; // ID du graphe généré pour ce fichier
}

export interface FileLink {
  id: string;
  fromFileId: string;
  toFileId: string;
  importName: string;
  exportName: string;
}

export interface ExtendedGraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  inputs: import('./nodes').Port[];
  outputs: import('./nodes').Port[];
  properties: Record<string, any>;
  width?: number;
  height?: number;
  // Extensions
  sourceInfo?: NodeSourceInfo;
  groupId?: string;
  collapsed?: boolean;
}

export interface ExtendedGraph {
  id: string;
  name: string;
  nodes: ExtendedGraphNode[];
  connections: import('./nodes').Connection[];
  groups: NodeGroup[];
  sourceFileId?: string;
}

export interface ProjectAnalysis {
  files: ProjectFile[];
  fileLinks: FileLink[];
  graphs: ExtendedGraph[];
  components: ComponentInfo[];
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  props: PropInfo[];
  hooks: HookInfo[];
  exports: string[];
  imports: ImportInfo[];
}

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface HookInfo {
  type: 'useState' | 'useEffect' | 'useMemo' | 'useRef' | 'useCallback' | 'useContext' | 'useReducer' | 'custom';
  name?: string;
  initialValue?: string;
  dependencies?: string[];
}

export interface ImportInfo {
  source: string;
  names: string[];
  isDefault: boolean;
  isNamespace: boolean;
}
