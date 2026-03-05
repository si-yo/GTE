import React, { useState, useMemo } from 'react';
import { TEMPLATES, Template, TemplateNode, TemplateConnection } from '../../templates/examples';
import { useGraph } from '../../store/GraphStore';
import { getNodeDefinition, GraphNode, Port, Connection } from '../../types/nodes';

interface Props {}

const categories = [
  { id: 'all', label: 'Tous', icon: '📚' },
  { id: 'basics', label: 'Bases', icon: '🎯' },
  { id: 'forms', label: 'Formulaires', icon: '📝' },
  { id: 'data', label: 'Données', icon: '📊' },
  { id: 'ui', label: 'Interface', icon: '🎨' },
  { id: 'state', label: 'État', icon: '🔄' },
  { id: 'apps', label: 'Applications', icon: '🚀' },
];

const difficulties = [
  { id: 'all', label: 'Tous niveaux', color: 'bg-gray-500' },
  { id: 'beginner', label: 'Débutant', color: 'bg-green-500' },
  { id: 'intermediate', label: 'Intermédiaire', color: 'bg-yellow-500' },
  { id: 'advanced', label: 'Avancé', color: 'bg-red-500' },
];

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner': return 'bg-green-500';
    case 'intermediate': return 'bg-yellow-500';
    case 'advanced': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner': return 'Débutant';
    case 'intermediate': return 'Intermédiaire';
    case 'advanced': return 'Avancé';
    default: return difficulty;
  }
};

export const TemplateLibraryTab: React.FC<Props> = () => {
  const { dispatch, activeProject, createNewProject, clearCurrentProject } = useGraph();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t: Template) => {
      const matchesSearch =
        searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const loadTemplateToProject = (template: Template, graphId: string) => {
    const nodeIdMap: Record<string, string> = {};
    const nodesToAdd: GraphNode[] = [];
    const connectionsToAdd: Connection[] = [];
    const baseTimestamp = Date.now();

    // First pass: create all nodes
    template.nodes.forEach((templateNode: TemplateNode, index: number) => {
      const def = getNodeDefinition(templateNode.type);
      if (!def) {
        console.warn(`Node definition not found for type: ${templateNode.type}`);
        return;
      }

      const nodeId = `node_${baseTimestamp}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      nodeIdMap[templateNode.id] = nodeId;

      const inputs: Port[] = def.inputs.map((input, i) => ({
        ...input,
        id: `${nodeId}_in_${i}`,
        connected: false,
      }));

      const outputs: Port[] = def.outputs.map((output, i) => ({
        ...output,
        id: `${nodeId}_out_${i}`,
        connected: false,
      }));

      const properties: Record<string, any> = {};
      Object.keys(templateNode.properties).forEach(key => {
        properties[key] = templateNode.properties[key];
      });
      def.properties?.forEach(prop => {
        if (properties[prop.name] === undefined) {
          properties[prop.name] = prop.default;
        }
      });

      const node: GraphNode = {
        id: nodeId,
        type: templateNode.type,
        x: templateNode.x,
        y: templateNode.y,
        inputs,
        outputs,
        properties,
      };

      nodesToAdd.push(node);
    });

    // Second pass: build connections
    template.connections.forEach((conn: TemplateConnection, connIndex: number) => {
      const fromNodeId = nodeIdMap[conn.fromNode];
      const toNodeId = nodeIdMap[conn.toNode];

      if (!fromNodeId || !toNodeId) return;

      const fromNode = nodesToAdd.find(n => n.id === fromNodeId);
      const toNode = nodesToAdd.find(n => n.id === toNodeId);

      if (!fromNode || !toNode) return;
      if (conn.fromPortIndex >= fromNode.outputs.length) return;
      if (conn.toPortIndex >= toNode.inputs.length) return;

      const fromPortId = `${fromNodeId}_out_${conn.fromPortIndex}`;
      const toPortId = `${toNodeId}_in_${conn.toPortIndex}`;

      const connection: Connection = {
        id: `conn_${baseTimestamp}_${connIndex}_${Math.random().toString(36).substr(2, 9)}`,
        fromNode: fromNodeId,
        fromPort: fromPortId,
        toNode: toNodeId,
        toPort: toPortId,
      };

      connectionsToAdd.push(connection);
    });

    // Add nodes
    nodesToAdd.forEach(node => {
      dispatch({ type: 'ADD_NODE', payload: { graphId, node } });
    });

    // Add connections after a frame
    requestAnimationFrame(() => {
      connectionsToAdd.forEach(connection => {
        dispatch({ type: 'ADD_CONNECTION', payload: { graphId, connection } });
      });
    });

    console.log(`Template "${template.name}" loaded: ${nodesToAdd.length} nodes, ${connectionsToAdd.length} connections`);
  };

  const handleLoadTemplate = (template: Template) => {
    setPendingTemplate(template);
  };

  const confirmLoad = (mode: 'new' | 'replace') => {
    if (!pendingTemplate) return;

    if (mode === 'new') {
      createNewProject(pendingTemplate.name);
      setTimeout(() => {
        loadTemplateToProject(pendingTemplate, 'main');
      }, 50);
    } else {
      if (activeProject) {
        clearCurrentProject();
        setTimeout(() => {
          loadTemplateToProject(pendingTemplate, 'main');
        }, 50);
      }
    }

    setPendingTemplate(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/50 border-b border-gray-700 space-y-3 flex-shrink-0 overflow-x-auto">
        {/* Search */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category and Difficulty filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.icon} <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>
          <div className="border-l border-gray-600 mx-1 sm:mx-2 hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedDifficulty === diff.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTemplates.map((template: Template) => (
              <div
                key={template.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 hover:border-blue-500 transition-colors cursor-pointer group"
                onClick={() => setPreviewTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm sm:text-base">
                    {template.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${getDifficultyColor(template.difficulty)}`}>
                    {getDifficultyLabel(template.difficulty)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{template.nodes.length} nœuds</span>
                  <span>{template.connections.length} connexions</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadTemplate(template);
                  }}
                  className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Charger
                </button>
              </div>
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">Aucun template trouvé</p>
              <p className="text-sm">Essayez d'autres critères de recherche</p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {previewTemplate && (
          <div className="w-72 sm:w-96 border-l border-gray-700 bg-gray-850 overflow-y-auto flex-shrink-0 hidden md:block">
            <div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">{previewTemplate.name}</h3>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1 text-gray-400 hover:text-white rounded"
                >
                  ✕
                </button>
              </div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs text-white ${getDifficultyColor(previewTemplate.difficulty)}`}>
                {getDifficultyLabel(previewTemplate.difficulty)}
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-1">Description</h4>
                <p className="text-sm text-gray-400">{previewTemplate.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Statistiques</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-xl font-bold text-blue-400">{previewTemplate.nodes.length}</div>
                    <div className="text-xs text-gray-400">Nœuds</div>
                  </div>
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-xl font-bold text-green-400">{previewTemplate.connections.length}</div>
                    <div className="text-xs text-gray-400">Connexions</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Nœuds utilisés</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {previewTemplate.nodes.map((node: TemplateNode) => {
                    const def = getNodeDefinition(node.type);
                    return (
                      <div key={node.id} className="flex items-center gap-2 text-sm bg-gray-800 px-2 py-1 rounded">
                        <span>{def?.icon || '📦'}</span>
                        <span className="text-gray-300 truncate">{def?.label || node.type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleLoadTemplate(previewTemplate)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🚀 Charger ce template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Load Mode Modal */}
      {pendingTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">Charger "{pendingTemplate.name}"</h3>
            <p className="text-gray-400 text-sm mb-6">Comment voulez-vous charger ce template ?</p>
            
            <div className="space-y-3">
              <button
                onClick={() => confirmLoad('new')}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">➕</span>
                <div className="text-left">
                  <div className="font-semibold">Nouveau projet</div>
                  <div className="text-xs text-green-200">Crée un nouvel onglet avec ce template</div>
                </div>
              </button>
              
              <button
                onClick={() => confirmLoad('replace')}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🔄</span>
                <div className="text-left">
                  <div className="font-semibold">Remplacer le projet actuel</div>
                  <div className="text-xs text-orange-200">Efface le projet actuel et charge le template</div>
                </div>
              </button>
              
              <button
                onClick={() => setPendingTemplate(null)}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
