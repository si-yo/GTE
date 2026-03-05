import React, { useState } from 'react';
import { GraphProvider, useGraph } from './store/GraphStore';
import { LeftPanel } from './components/LeftPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Toolbar } from './components/Toolbar';
import { CodeExportModal } from './components/CodeExportModal';
import { PreviewModal } from './components/PreviewModal';
import { HelpModal } from './components/HelpModal';
import { LibraryAndPlugins } from './components/LibraryAndPlugins';
import FileExplorer from './components/FileExplorer';

const ProjectTabs: React.FC = () => {
  const { state, dispatch, createNewProject, activeProject } = useGraph();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleNewProject = () => {
    createNewProject();
  };

  const handleCloseProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.projects.length <= 1) return;
    
    const project = state.projects.find(p => p.id === projectId);
    if (project?.modified) {
      if (!confirm(`Le projet "${project.name}" a des modifications non sauvegardées. Fermer quand même ?`)) {
        return;
      }
    }
    dispatch({ type: 'DELETE_PROJECT', payload: projectId });
  };

  const handleStartRename = (projectId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(projectId);
    setEditName(name);
  };

  const handleSaveRename = () => {
    if (editingTabId && editName.trim()) {
      dispatch({ type: 'RENAME_PROJECT', payload: { projectId: editingTabId, name: editName.trim() } });
    }
    setEditingTabId(null);
  };

  return (
    <div className="h-9 bg-slate-900 border-b border-slate-700 flex items-center px-2 overflow-x-auto scrollbar-thin flex-shrink-0">
      <div className="flex items-center gap-1 min-w-0">
        {state.projects.map((project) => (
          <div
            key={project.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project.id })}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all min-w-0 max-w-[180px] ${
              project.id === state.activeProjectId
                ? 'bg-slate-800 text-white border-t-2 border-blue-500'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            {editingTabId === project.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setEditingTabId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <>
                <span className="text-sm truncate flex-1" onDoubleClick={(e) => handleStartRename(project.id, project.name, e)}>
                  {project.name}
                </span>
                {project.modified && (
                  <span className="text-blue-400 text-xs flex-shrink-0">•</span>
                )}
              </>
            )}
            {state.projects.length > 1 && (
              <button
                onClick={(e) => handleCloseProject(project.id, e)}
                className={`p-0.5 rounded hover:bg-slate-600 transition-colors flex-shrink-0 ${
                  project.id === state.activeProjectId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleNewProject}
        className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors flex-shrink-0"
        title="Nouveau projet"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      {activeProject && (
        <div className="ml-auto text-xs text-slate-500 flex-shrink-0 hidden sm:block">
          {activeProject.graphs.length} composant(s)
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryInitialTab, setLibraryInitialTab] = useState<'library' | 'plugins'>('library');
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Project Tabs */}
      <ProjectTabs />
      
      {/* Toolbar with file explorer button */}
      <div className="flex items-center bg-slate-900 border-b border-slate-700">
        {/* File Explorer Button - à côté du logo */}
        <button
          onClick={() => setShowFileExplorer(true)}
          className="p-2 mx-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Explorateur de fichiers"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
        
        <div className="flex-1">
          <Toolbar
            onExport={() => setShowExportModal(true)}
            onPreview={() => setShowPreviewModal(true)}
            onHelp={() => setShowHelpModal(true)}
            onLibrary={() => {
              setLibraryInitialTab('library');
              setShowLibraryModal(true);
            }}
            onPlugins={() => {
              setLibraryInitialTab('plugins');
              setShowLibraryModal(true);
            }}
            showLeftPanel={showLeftPanel}
            onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
            showRightPanel={showRightPanel}
            onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Node palette, components, entities */}
        {showLeftPanel && (
          <div className="w-64 lg:w-72 flex-shrink-0 hidden sm:block">
            <LeftPanel />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-0 flex flex-col">
          <GraphCanvas />
        </div>

        {/* Right panel - Properties */}
        {showRightPanel && (
          <div className="w-72 lg:w-80 flex-shrink-0 hidden md:block">
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Mobile panel toggles */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 flex justify-between z-40">
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className={`p-3 rounded-full shadow-lg transition-colors ${
            showLeftPanel ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          📑
        </button>
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className={`p-3 rounded-full shadow-lg transition-colors ${
            showRightPanel ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          ⚙️
        </button>
      </div>

      {/* Mobile panels as overlays */}
      {showLeftPanel && (
        <div className="sm:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setShowLeftPanel(false)}>
          <div className="w-72 h-full bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <LeftPanel />
          </div>
        </div>
      )}

      {/* Modals */}
      <CodeExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <LibraryAndPlugins
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        initialTab={libraryInitialTab}
      />
      <FileExplorer
        isOpen={showFileExplorer}
        onClose={() => setShowFileExplorer(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GraphProvider>
      <AppContent />
    </GraphProvider>
  );
};

export default App;
