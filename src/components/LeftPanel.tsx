import React, { useState } from 'react';
import { NodePalette } from './NodePalette';
import { GraphsPanel } from './GraphsPanel';
import { EntitiesPanel } from './EntitiesPanel';

type Tab = 'nodes' | 'components' | 'entities';

export const LeftPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('nodes');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'nodes', label: 'Nœuds', icon: '📦' },
    { id: 'components', label: 'Composants', icon: '📑' },
    { id: 'entities', label: 'Entités', icon: '🏗️' },
  ];

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-full min-w-[288px]">
      {/* Tabs - icônes uniquement avec tooltip */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={`flex-1 px-2 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 relative group ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="hidden sm:inline text-xs">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 sm:hidden">
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Content with scroll */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'nodes' && <NodePalette />}
        {activeTab === 'components' && <GraphsPanel />}
        {activeTab === 'entities' && <EntitiesPanel />}
      </div>
    </div>
  );
};
