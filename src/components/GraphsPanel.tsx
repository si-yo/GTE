import React, { useState } from 'react';
import { useGraph } from '../store/GraphStore';
import { Graph } from '../types/nodes';

export const GraphsPanel: React.FC = () => {
  const { activeProject, dispatch } = useGraph();
  const [newGraphName, setNewGraphName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const graphs = activeProject?.graphs || [];
  const activeGraphId = activeProject?.activeGraphId || '';

  const handleAddGraph = () => {
    if (!newGraphName.trim()) return;

    const graph: Graph = {
      id: `graph_${Date.now()}`,
      name: newGraphName,
      nodes: [],
      connections: [],
    };

    dispatch({ type: 'ADD_GRAPH', payload: graph });
    setNewGraphName('');
  };

  const handleStartEdit = (graph: Graph) => {
    setEditingId(graph.id);
    setEditName(graph.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-base font-bold text-white mb-2">📑 Composants</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nouveau composant..."
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGraph()}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAddGraph}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex-shrink-0"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {graphs.map((graph: Graph) => (
            <div
              key={graph.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                activeGraphId === graph.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_GRAPH', payload: graph.id })}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="flex-shrink-0">{activeGraphId === graph.id ? '📂' : '📁'}</span>
                {editingId === graph.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                    autoFocus
                  />
                ) : (
                  <div className="truncate min-w-0">
                    <p className="text-sm font-medium truncate">{graph.name}</p>
                    <p className={`text-xs ${activeGraphId === graph.id ? 'text-blue-200' : 'text-slate-500'}`}>
                      {graph.nodes.length} nœuds • {graph.connections.length} liens
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(graph);
                  }}
                  className={`p-1 rounded transition-colors ${
                    activeGraphId === graph.id
                      ? 'hover:bg-blue-500'
                      : 'hover:bg-slate-600'
                  }`}
                  title="Renommer"
                >
                  ✏️
                </button>
                {graphs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Supprimer ce composant ?')) {
                        dispatch({ type: 'DELETE_GRAPH', payload: graph.id });
                      }
                    }}
                    className={`p-1 rounded transition-colors ${
                      activeGraphId === graph.id
                        ? 'hover:bg-red-500'
                        : 'hover:bg-red-600'
                    }`}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
        <p className="text-xs text-slate-500">
          Chaque composant est un graphe React indépendant que vous pouvez réutiliser.
        </p>
      </div>
    </div>
  );
};
