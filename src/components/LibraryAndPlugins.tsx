import React, { useState } from 'react';
import { TemplateLibraryTab } from './tabs/TemplateLibraryTab';
import { PluginManagerTab } from './tabs/PluginManagerTab';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'library' | 'plugins';
}

export const LibraryAndPlugins: React.FC<Props> = ({ isOpen, onClose, initialTab = 'library' }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'plugins'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{activeTab === 'library' ? '📚' : '🔌'}</span>
            
            {/* Tab Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📚 Bibliothèque
              </button>
              <button
                onClick={() => setActiveTab('plugins')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'plugins'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🔌 Plugins
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'library' ? (
            <TemplateLibraryTab />
          ) : (
            <PluginManagerTab />
          )}
        </div>
      </div>
    </div>
  );
};
