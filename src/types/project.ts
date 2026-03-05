// Types pour la gestion de projet et l'arborescence de fichiers

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  content?: string;
  children?: ProjectFile[];
  parentId?: string;
  graphId?: string; // Lien vers un graph si le fichier est converti
  imports?: string[]; // Imports depuis d'autres fichiers
  exports?: string[]; // Exports du fichier
  isOpen?: boolean; // Pour les dossiers
  isSelected?: boolean;
  lastModified?: Date;
}

export interface ProjectStructure {
  id: string;
  name: string;
  rootPath: string;
  files: ProjectFile[];
  activeFileId?: string;
  dependencies: Record<string, string>; // package.json dependencies
  devDependencies: Record<string, string>;
}

export interface FileLink {
  sourceFileId: string;
  targetFileId: string;
  importName: string;
  importType: 'default' | 'named' | 'namespace';
}

export interface ParsedComponent {
  name: string;
  type: 'functional' | 'class';
  props: { name: string; type: string; required: boolean }[];
  states: { name: string; type: string; initialValue: any }[];
  effects: { dependencies: string[]; hasCleanup: boolean }[];
  memos: { dependencies: string[]; }[];
  refs: { name: string; type: string }[];
  imports: { from: string; names: string[] }[];
  jsx: string;
}

export interface ImportAnalysis {
  filePath: string;
  imports: {
    source: string;
    specifiers: {
      name: string;
      alias?: string;
      type: 'default' | 'named' | 'namespace';
    }[];
  }[];
  exports: {
    name: string;
    type: 'default' | 'named';
  }[];
}
