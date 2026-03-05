import React, { useState } from 'react';
import { NODE_DEFINITIONS, NodeCategory, NodeDefinition } from '../types/nodes';
import { useGraph } from '../store/GraphStore';
import { Plugin, PluginNodeDef, PluginPort } from '../types/plugins';

const categories: { id: NodeCategory | 'plugins'; label: string; icon: string }[] = [
  { id: 'ui', label: 'UI', icon: '🎨' },
  { id: 'hook', label: 'Hooks', icon: '🪝' },
  { id: 'async', label: 'Async', icon: '⏳' },
  { id: 'logic', label: 'Logic', icon: '🧠' },
  { id: 'data', label: 'Data', icon: '📦' },
  { id: 'math', label: 'Math', icon: '🔢' },
  { id: 'event', label: 'Events', icon: '⚡' },
  { id: 'entity', label: 'Entity', icon: '🏗️' },
  { id: 'plugins', label: 'Plugins', icon: '🔌' },
];

const NodeItem: React.FC<{ def: NodeDefinition; isPlugin?: boolean }> = ({ def, isPlugin }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('nodeType', def.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:bg-slate-700 border border-transparent hover:border-slate-600 hover:shadow-lg ${
        isPlugin ? 'ring-1 ring-purple-500/30' : ''
      }`}
      style={{ backgroundColor: `${def.color}15` }}
      title={`${def.label}\n${def.inputs.length} entrées • ${def.outputs.length} sorties`}
    >
      <span className="text-lg flex-shrink-0">{def.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{def.label}</p>
        <p className="text-xs text-slate-500">
          {def.inputs.length} in • {def.outputs.length} out
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isPlugin && <span className="text-xs text-purple-400">🔌</span>}
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: def.color }} />
      </div>
    </div>
  );
};

// Convertir un PluginNodeDef en NodeDefinition
const pluginNodeToDefinition = (node: PluginNodeDef): NodeDefinition => ({
  type: node.type,
  label: node.label,
  category: node.category,
  icon: node.icon,
  color: node.color,
  inputs: node.inputs.map((input: PluginPort) => ({
    name: input.name,
    type: input.type,
    dataType: input.dataType,
  })),
  outputs: node.outputs.map((output: PluginPort) => ({
    name: output.name,
    type: output.type,
    dataType: output.dataType,
  })),
  properties: [],
});

export const NodePalette: React.FC = () => {
  const { activeProject } = useGraph();
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'plugins'>('ui');
  const [searchQuery, setSearchQuery] = useState('');

  // Récupérer les nœuds des plugins installés
  const pluginNodes: NodeDefinition[] = [];
  const installedPlugins: Plugin[] = activeProject?.installedPlugins || [];
  
  installedPlugins.forEach((plugin: Plugin) => {
    plugin.nodes.forEach((node: PluginNodeDef) => {
      pluginNodes.push(pluginNodeToDefinition(node));
    });
  });

  const allNodes = [...NODE_DEFINITIONS, ...pluginNodes];

  const filteredNodes = allNodes.filter((def) => {
    if (searchQuery) {
      return (
        def.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeCategory === 'plugins') {
      return pluginNodes.some((p) => p.type === def.type);
    }
    return def.category === activeCategory;
  });

  const pluginCount = pluginNodes.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span>📦</span>
          <span>Nœuds</span>
          <span className="text-xs text-slate-500 font-normal">({allNodes.length})</span>
        </h2>
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Categories - Grille avec icônes et tooltips */}
      {!searchQuery && (
        <div className="p-2 border-b border-slate-700 flex-shrink-0">
          <div className="grid grid-cols-5 gap-1">
            {categories.map((cat) => {
              const isPlugins = cat.id === 'plugins';
              const count =
                isPlugins
                  ? pluginCount
                  : allNodes.filter((n) => n.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  title={`${cat.label} (${count})`}
                  className={`relative px-1 py-2 rounded-lg text-center transition-all group ${
                    activeCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : isPlugins && pluginCount > 0
                      ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 ring-1 ring-purple-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  } ${isPlugins && pluginCount === 0 ? 'opacity-50' : ''}`}
                >
                  <span className="text-base block">{cat.icon}</span>
                  <span className="text-[9px] block mt-0.5 truncate leading-tight">{cat.label}</span>

                  {/* Badge count */}
                  {count > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
                        activeCategory === cat.id
                          ? 'bg-white text-blue-600'
                          : isPlugins
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-600 text-slate-200'
                      }`}
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {cat.label} ({count})
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nodes list */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {!searchQuery && (
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
            <span>{categories.find((c) => c.id === activeCategory)?.icon}</span>
            <span>{categories.find((c) => c.id === activeCategory)?.label}</span>
            <span className="text-slate-600">({filteredNodes.length})</span>
          </div>
        )}

        {searchQuery && filteredNodes.length > 0 && (
          <div className="text-xs text-slate-500 mb-2 px-2">
            {filteredNodes.length} résultat(s) pour "{searchQuery}"
          </div>
        )}

        {/* Message si catégorie plugins vide */}
        {activeCategory === 'plugins' && pluginCount === 0 && !searchQuery && (
          <div className="text-center py-6 px-3">
            <div className="text-3xl mb-2">🔌</div>
            <p className="text-slate-400 text-sm mb-2">Aucun plugin</p>
            <p className="text-slate-500 text-xs">
              Cliquez sur <span className="text-purple-400">🔌 Plugins</span> dans la toolbar
            </p>
          </div>
        )}

        {filteredNodes.map((def) => (
          <NodeItem
            key={def.type}
            def={def}
            isPlugin={pluginNodes.some((p) => p.type === def.type)}
          />
        ))}

        {filteredNodes.length === 0 && activeCategory !== 'plugins' && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Aucun nœud trouvé</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-400 text-xs mt-2 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
        <p className="text-xs text-slate-500 leading-relaxed">
          💡 <strong className="text-slate-400">Glisser-déposer</strong> un nœud sur le canvas
        </p>
      </div>
    </div>
  );
};
