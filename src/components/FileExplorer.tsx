import React, { useState, useCallback } from 'react';
import { useGraph } from '../store/GraphStore';
import { parseFile, parseProject } from '../utils/projectParser';
import { ProjectFile, ExtendedGraph, FileLink, ComponentInfo } from '../types/graph';

// Helper pour créer un projet complet
const createProjectFromGraph = (name: string, graph: ExtendedGraph) => ({
  id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  graphs: [{
    id: graph.id,
    name: graph.name,
    nodes: graph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      inputs: n.inputs,
      outputs: n.outputs,
      properties: n.properties,
      width: n.width,
      height: n.height,
    })),
    connections: graph.connections,
  }],
  activeGraphId: graph.id,
  entities: [],
  modified: false,
  installedPlugins: [],
});

interface FileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useGraph();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [analysisResult, setAnalysisResult] = useState<{
    graphs: ExtendedGraph[];
    fileLinks: FileLink[];
    components: ComponentInfo[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'analysis' | 'links'>('files');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Lire un fichier
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Construire l'arborescence à partir des fichiers
  const buildFileTree = async (fileList: FileList): Promise<ProjectFile[]> => {
    const tree: ProjectFile[] = [];
    const folderMap = new Map<string, ProjectFile>();

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const path = (file as any).webkitRelativePath || file.name;
      const parts = path.split('/');
      
      let currentPath = '';
      let currentLevel = tree;
      
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        const isFile = j === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (isFile) {
          const content = await readFileContent(file);
          const fileNode: ProjectFile = {
            id: `file_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: part,
            path: currentPath,
            content,
            type: 'file',
          };
          currentLevel.push(fileNode);
        } else {
          let folder = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              id: `folder_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
              name: part,
              path: currentPath,
              content: '',
              type: 'folder',
              children: [],
            };
            folderMap.set(currentPath, folder);
            currentLevel.push(folder);
          }
          currentLevel = folder.children!;
        }
      }
    }
    
    return tree;
  };

  // Gérer le drop de fichiers
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const items = e.dataTransfer.items;
    
    if (items) {
      const processEntry = async (entry: FileSystemEntry, path: string = ''): Promise<ProjectFile[]> => {
        const results: ProjectFile[] = [];
        
        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve) => fileEntry.file(resolve));
          const content = await readFileContent(file);
          results.push({
            id: `file_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${entry.name}`,
            name: entry.name,
            path: path ? `${path}/${entry.name}` : entry.name,
            content,
            type: 'file',
          });
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry;
          const reader = dirEntry.createReader();
          const entries = await new Promise<FileSystemEntry[]>((resolve) => {
            reader.readEntries(resolve);
          });
          
          const children: ProjectFile[] = [];
          for (const childEntry of entries) {
            const childResults = await processEntry(
              childEntry, 
              path ? `${path}/${entry.name}` : entry.name
            );
            children.push(...childResults);
          }
          
          results.push({
            id: `folder_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${entry.name}`,
            name: entry.name,
            path: path ? `${path}/${entry.name}` : entry.name,
            content: '',
            type: 'folder',
            children,
          });
        }
        
        return results;
      };
      
      const allFiles: ProjectFile[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          const results = await processEntry(entry);
          allFiles.push(...results);
        }
      }
      
      setFiles(prev => [...prev, ...allFiles]);
    }
  }, []);

  // Gérer la sélection de fichiers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const tree = await buildFileTree(fileList);
      setFiles(prev => [...prev, ...tree]);
    }
  };

  // Analyser tous les fichiers du projet
  const analyzeProject = async () => {
    setIsAnalyzing(true);
    try {
      const result = parseProject(files);
      setAnalysisResult(result);
      setActiveTab('analysis');
      console.log('Project analysis:', result);
    } catch (error) {
      console.error('Error analyzing project:', error);
    }
    setIsAnalyzing(false);
  };

  // Analyser un fichier et créer le graphe
  const analyzeFile = (file: ProjectFile) => {
    const result = parseFile(file);
    if (result) {
      const project = createProjectFromGraph(result.componentInfo.name, result.graph);
      dispatch({
        type: 'ADD_PROJECT',
        payload: project,
      });
      console.log(`Fichier "${file.name}" converti en graphe avec ${result.graph.nodes.length} nœuds`);
      onClose();
    }
  };

  // Importer tous les graphes analysés
  const importAllGraphs = () => {
    if (!analysisResult) return;
    
    analysisResult.graphs.forEach((graph) => {
      const project = createProjectFromGraph(graph.name, graph);
      dispatch({
        type: 'ADD_PROJECT',
        payload: project,
      });
    });
    
    onClose();
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Supprimer un fichier/dossier
  const removeFile = (fileId: string) => {
    const removeRecursive = (items: ProjectFile[]): ProjectFile[] => {
      return items.filter(item => {
        if (item.id === fileId) return false;
        if (item.children) {
          item.children = removeRecursive(item.children);
        }
        return true;
      });
    };
    setFiles(removeRecursive(files));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  // Rendu d'un fichier/dossier
  const renderFileTree = (items: ProjectFile[], depth: number = 0): React.ReactNode => {
    return items.map(item => {
      const isExpanded = expandedFolders.has(item.id);
      const isSelected = selectedFile?.id === item.id;
      const ext = item.name.split('.').pop()?.toLowerCase();
      
      let icon = '📄';
      if (item.type === 'folder') {
        icon = isExpanded ? '📂' : '📁';
      } else if (['tsx', 'jsx'].includes(ext || '')) {
        icon = '⚛️';
      } else if (['ts', 'js'].includes(ext || '')) {
        icon = '📜';
      } else if (ext === 'css') {
        icon = '🎨';
      } else if (ext === 'json') {
        icon = '📋';
      } else if (ext === 'html') {
        icon = '🌐';
      } else if (ext === 'md') {
        icon = '📝';
      }
      
      const isAnalyzable = item.type === 'file' && ['tsx', 'jsx', 'ts', 'js'].includes(ext || '');
      
      return (
        <div key={item.id}>
          <div
            className={`group flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded transition-colors ${
              isSelected 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700 text-gray-300'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.id);
              } else {
                setSelectedFile(item);
              }
            }}
          >
            {item.type === 'folder' && (
              <span className="text-gray-500 w-4 text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            <span className="flex-shrink-0">{icon}</span>
            <span className="truncate flex-1 text-sm">{item.name}</span>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isAnalyzable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    analyzeFile(item);
                  }}
                  className="p-1 text-xs bg-green-600 hover:bg-green-500 rounded"
                  title="Convertir en graphe"
                >
                  ⚡
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(item.id);
                }}
                className="p-1 text-xs bg-red-600/50 hover:bg-red-500 rounded"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          </div>
          {item.type === 'folder' && isExpanded && item.children && (
            <div>{renderFileTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // Compter les fichiers
  const countFiles = (items: ProjectFile[]): number => {
    return items.reduce((count, item) => {
      if (item.type === 'folder' && item.children) {
        return count + countFiles(item.children);
      }
      return count + 1;
    }, 0);
  };

  // Obtenir les statistiques d'un fichier
  const getFileStats = (file: ProjectFile) => {
    if (!file.content) return null;
    
    const lines = file.content.split('\n').length;
    const hasJsx = /<\w+/.test(file.content);
    const hooks = (file.content.match(/use[A-Z]\w+/g) || []);
    const imports = (file.content.match(/^import/gm) || []).length;
    const exports = (file.content.match(/^export/gm) || []).length;
    
    return { lines, hasJsx, hooks: [...new Set(hooks)], imports, exports };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📂</span>
            <div>
              <h2 className="text-xl font-bold text-white">Explorateur de Projet</h2>
              <p className="text-gray-400 text-sm">
                Importez et analysez des projets React complets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-850">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📁 Fichiers ({countFiles(files)})
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 Analyse {analysisResult && `(${analysisResult.graphs.length})`}
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔗 Liens {analysisResult && `(${analysisResult.fileLinks.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'files' && (
            <>
              {/* File tree */}
              <div className="w-1/3 border-r border-gray-700 flex flex-col">
                {/* Drop zone / Import buttons */}
                <div
                  className={`p-4 border-b border-gray-700 transition-colors ${
                    isDragOver ? 'bg-blue-900/30' : ''
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-blue-500'
                  }`}>
                    <p className="text-gray-400 mb-3">
                      {isDragOver ? '📥 Déposez ici...' : 'Glissez-déposez des fichiers ou dossiers'}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded cursor-pointer text-sm transition-colors">
                        📄 Fichiers
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                          accept=".ts,.tsx,.js,.jsx,.json,.css,.html,.md"
                        />
                      </label>
                      <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded cursor-pointer text-sm transition-colors">
                        📁 Dossier
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                          {...({ webkitdirectory: 'true', directory: 'true' } as any)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* File tree */}
                <div className="flex-1 overflow-auto p-2">
                  {files.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-4xl mb-2">📂</p>
                      <p>Aucun fichier importé</p>
                      <p className="text-xs mt-2 text-gray-600">
                        Importez un projet React pour commencer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {renderFileTree(files)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {files.length > 0 && (
                  <div className="p-3 border-t border-gray-700 space-y-2">
                    <button
                      onClick={analyzeProject}
                      disabled={isAnalyzing}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          🔍 Analyser tout le projet
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setFiles([]);
                        setSelectedFile(null);
                        setAnalysisResult(null);
                      }}
                      className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition-colors"
                    >
                      🗑️ Vider
                    </button>
                  </div>
                )}
              </div>

              {/* File preview */}
              <div className="flex-1 flex flex-col bg-gray-900/50">
                {selectedFile ? (
                  <>
                    {/* File info */}
                    <div className="p-4 border-b border-gray-700 bg-gray-850">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white flex items-center gap-2">
                            <span>⚛️</span>
                            {selectedFile.name}
                          </h3>
                          <p className="text-gray-400 text-sm">{selectedFile.path}</p>
                        </div>
                        {['tsx', 'jsx', 'ts', 'js'].includes(selectedFile.name.split('.').pop() || '') && (
                          <button
                            onClick={() => analyzeFile(selectedFile)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors flex items-center gap-2"
                          >
                            <span>⚡</span>
                            Convertir en graphe
                          </button>
                        )}
                      </div>
                      
                      {/* Stats */}
                      {(() => {
                        const stats = getFileStats(selectedFile);
                        if (!stats) return null;
                        return (
                          <div className="flex flex-wrap gap-3 mt-3 text-sm">
                            <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                              📝 {stats.lines} lignes
                            </span>
                            <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                              📥 {stats.imports} imports
                            </span>
                            <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                              📤 {stats.exports} exports
                            </span>
                            {stats.hasJsx && (
                              <span className="px-2 py-1 bg-blue-600/30 rounded text-blue-300">⚛️ JSX</span>
                            )}
                            {stats.hooks.length > 0 && (
                              <span className="px-2 py-1 bg-purple-600/30 rounded text-purple-300">
                                🪝 {stats.hooks.slice(0, 3).join(', ')}
                                {stats.hooks.length > 3 && ` +${stats.hooks.length - 3}`}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Code preview */}
                    <div className="flex-1 overflow-auto p-4">
                      <pre className="text-sm text-gray-300 font-mono">
                        {selectedFile.content?.split('\n').map((line, i) => (
                          <div key={i} className="flex hover:bg-gray-700/30 leading-6">
                            <span className="w-12 text-gray-500 text-right pr-4 select-none flex-shrink-0">
                              {i + 1}
                            </span>
                            <code className="flex-1 whitespace-pre-wrap break-all">{line || ' '}</code>
                          </div>
                        ))}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <p className="text-5xl mb-4">📄</p>
                      <p>Sélectionnez un fichier pour voir son contenu</p>
                      <p className="text-sm text-gray-600 mt-2">
                        Cliquez sur ⚡ pour convertir un fichier en graphe
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'analysis' && (
            <div className="flex-1 overflow-auto p-4">
              {!analysisResult ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="text-5xl mb-4">📊</p>
                  <p className="mb-4">Aucune analyse effectuée</p>
                  <button
                    onClick={analyzeProject}
                    disabled={files.length === 0 || isAnalyzing}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded font-medium transition-colors"
                  >
                    🔍 Analyser le projet
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-white">📊 Résumé de l'analyse</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-3xl font-bold text-blue-400">
                          {analysisResult.graphs.length}
                        </p>
                        <p className="text-gray-400 text-sm">Composants</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-3xl font-bold text-green-400">
                          {analysisResult.graphs.reduce((sum, g) => sum + g.nodes.length, 0)}
                        </p>
                        <p className="text-gray-400 text-sm">Nœuds totaux</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-3xl font-bold text-purple-400">
                          {analysisResult.fileLinks.length}
                        </p>
                        <p className="text-gray-400 text-sm">Liens</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={importAllGraphs}
                      className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
                    >
                      📥 Importer tous les composants ({analysisResult.graphs.length})
                    </button>
                  </div>

                  {/* Components list */}
                  <div>
                    <h3 className="font-semibold mb-3 text-white">⚛️ Composants détectés</h3>
                    <div className="space-y-2">
                      {analysisResult.components.map((comp, index) => (
                        <div
                          key={index}
                          className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white flex items-center gap-2">
                              <span className="text-blue-400">⚛️</span>
                              {comp.name}
                            </h4>
                            <button
                              onClick={() => {
                                const graph = analysisResult.graphs[index];
                                if (graph) {
                                  const project = createProjectFromGraph(graph.name, graph);
                                  dispatch({
                                    type: 'ADD_PROJECT',
                                    payload: project,
                                  });
                                }
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
                            >
                              📥 Importer
                            </button>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-2">{comp.filePath}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {comp.hooks.map((hook, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs"
                              >
                                🪝 {hook.type}
                                {hook.name && `: ${hook.name}`}
                              </span>
                            ))}
                            {comp.props.map((prop, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs"
                              >
                                📋 {prop.name}: {prop.type}
                              </span>
                            ))}
                          </div>
                          
                          {/* Graph preview */}
                          {analysisResult.graphs[index] && (
                            <div className="mt-2 text-xs text-gray-500 flex gap-4">
                              <span>📊 {analysisResult.graphs[index].nodes.length} nœuds</span>
                              <span>🔗 {analysisResult.graphs[index].connections.length} connexions</span>
                              {analysisResult.graphs[index].groups.length > 0 && (
                                <span>📦 {analysisResult.graphs[index].groups.length} groupes</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="flex-1 overflow-auto p-4">
              {!analysisResult || analysisResult.fileLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="text-5xl mb-4">🔗</p>
                  <p>Aucun lien entre fichiers détecté</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Analysez le projet pour voir les dépendances
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white">🔗 Dépendances entre fichiers</h3>
                  
                  {/* Dependency graph visualization */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <p className="text-gray-400 text-sm mb-4">
                      Graphe des dépendances entre les composants du projet :
                    </p>
                    
                    <div className="space-y-2">
                      {analysisResult.fileLinks.map((link, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 bg-gray-800 rounded p-3"
                        >
                          <span className="text-blue-400 font-mono text-sm truncate flex-1 min-w-0">
                            📄 {link.fromFileId.split('/').pop()}
                          </span>
                          <div className="flex items-center gap-2 text-gray-400">
                            <span>─</span>
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                              import
                            </span>
                            <span>→</span>
                          </div>
                          <span className="text-purple-400 font-medium">
                            {link.importName}
                          </span>
                          <span className="text-gray-400">from</span>
                          <span className="text-green-400 font-mono text-sm truncate flex-1 min-w-0">
                            📄 {link.toFileId.split('/').pop()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Info box */}
                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">
                      💡 Les liens entre fichiers permettent de comprendre comment les composants
                      s'importent entre eux. Cela aide à visualiser l'architecture du projet
                      et à identifier les dépendances circulaires potentielles.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
