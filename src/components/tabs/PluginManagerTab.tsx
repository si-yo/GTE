import React, { useState } from 'react';
import { useGraph } from '../../store/GraphStore';
import { Plugin, PluginNodeDef, MARKETPLACE_PLUGINS, getPluginCategories } from '../../types/plugins';

type TabType = 'marketplace' | 'installed' | 'create';

export const PluginManagerTab: React.FC = () => {
  const { activeProject, dispatch } = useGraph();
  const [activeTab, setActiveTab] = useState<TabType>('marketplace');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Custom plugin creation state
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeIcon, setNewNodeIcon] = useState('🔧');

  const installedPlugins = activeProject?.installedPlugins || [];

  const filteredPlugins = MARKETPLACE_PLUGINS.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isInstalled = (pluginId: string) => {
    return installedPlugins.some((p: Plugin) => p.id === pluginId);
  };

  const installPlugin = (plugin: Plugin) => {
    dispatch({ type: 'INSTALL_PLUGIN', payload: plugin });
  };

  const uninstallPlugin = (pluginId: string) => {
    dispatch({ type: 'UNINSTALL_PLUGIN', payload: pluginId });
  };

  const createCustomPlugin = () => {
    if (!newPluginName || !newNodeLabel) return;

    const customPlugin: Plugin = {
      id: `custom_${Date.now()}`,
      name: newPluginName,
      version: '1.0.0',
      description: newPluginDesc || 'Plugin personnalisé',
      author: 'User',
      category: 'custom',
      isCustom: true,
      nodes: [
        {
          id: `custom_node_${Date.now()}`,
          type: `custom-${newNodeLabel.toLowerCase().replace(/\s+/g, '-')}`,
          label: newNodeLabel,
          category: 'plugin',
          color: '#9333EA',
          icon: newNodeIcon,
          inputs: [
            { name: 'flow', type: 'input', dataType: 'flow' },
            { name: 'input', type: 'input', dataType: 'any' },
          ],
          outputs: [
            { name: 'output', type: 'output', dataType: 'any' },
          ],
        },
      ],
    };

    dispatch({ type: 'INSTALL_PLUGIN', payload: customPlugin });
    
    // Reset form
    setNewPluginName('');
    setNewPluginDesc('');
    setNewNodeLabel('');
    setNewNodeIcon('🔧');
    setActiveTab('installed');
  };

  const tabs = [
    { id: 'marketplace' as TabType, label: '📦 Marketplace', count: MARKETPLACE_PLUGINS.length },
    { id: 'installed' as TabType, label: '✅ Installés', count: installedPlugins.length },
    { id: 'create' as TabType, label: '➕ Créer' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Toutes</option>
                {getPluginCategories().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Plugin List */}
            <div className="space-y-3">
              {filteredPlugins.map(plugin => (
                <div key={plugin.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{plugin.nodes[0]?.icon || '📦'}</span>
                        <h3 className="font-bold text-white">{plugin.name}</h3>
                        <span className="text-xs text-gray-500">v{plugin.version}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{plugin.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {plugin.nodes.map((node: PluginNodeDef) => (
                          <span key={node.id} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                            {node.icon} {node.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => isInstalled(plugin.id) ? uninstallPlugin(plugin.id) : installPlugin(plugin)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        isInstalled(plugin.id)
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {isInstalled(plugin.id) ? '🗑️ Désinstaller' : '⬇️ Installer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'installed' && (
          <div className="space-y-3">
            {installedPlugins.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📭</div>
                <p>Aucun plugin installé</p>
                <p className="text-sm">Explorez le Marketplace pour en ajouter</p>
              </div>
            ) : (
              installedPlugins.map((plugin: Plugin) => (
                <div key={plugin.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{plugin.nodes[0]?.icon || '📦'}</span>
                        <h3 className="font-bold text-white">{plugin.name}</h3>
                        {plugin.isCustom && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            Personnalisé
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{plugin.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {plugin.nodes.map((node: PluginNodeDef) => (
                          <span key={node.id} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                            {node.icon} {node.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => uninstallPlugin(plugin.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm"
                    >
                      🗑️ Désinstaller
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-bold text-white mb-4">➕ Créer un plugin personnalisé</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nom du plugin</label>
                  <input
                    type="text"
                    value={newPluginName}
                    onChange={(e) => setNewPluginName(e.target.value)}
                    placeholder="@my/plugin"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newPluginDesc}
                    onChange={(e) => setNewPluginDesc(e.target.value)}
                    placeholder="Description du plugin"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Label du nœud</label>
                    <input
                      type="text"
                      value={newNodeLabel}
                      onChange={(e) => setNewNodeLabel(e.target.value)}
                      placeholder="Mon Composant"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm text-gray-400 mb-1">Icône</label>
                    <input
                      type="text"
                      value={newNodeIcon}
                      onChange={(e) => setNewNodeIcon(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={createCustomPlugin}
                  disabled={!newPluginName || !newNodeLabel}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  ✨ Créer le plugin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
