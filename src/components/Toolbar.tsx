import React from 'react';
import { useGraph } from '../store/GraphStore';

interface ToolbarProps {
  onExport: () => void;
  onPreview: () => void;
  onHelp: () => void;
  onLibrary: () => void;
  onPlugins?: () => void;
  showLeftPanel?: boolean;
  onToggleLeftPanel?: () => void;
  showRightPanel?: boolean;
  onToggleRightPanel?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  onExport, 
  onPreview, 
  onHelp, 
  onLibrary,
  onPlugins,
  showLeftPanel,
  onToggleLeftPanel,
  showRightPanel,
  onToggleRightPanel,
}) => {
  const { state, dispatch, activeGraph } = useGraph();

  const handleSave = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-blueprint.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      try {
        const data = JSON.parse(text);
        dispatch({ type: 'LOAD_STATE', payload: data });
      } catch {
        alert('Fichier invalide');
      }
    };
    input.click();
  };

  const handleZoomIn = () => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom + 0.1 });
  };

  const handleZoomOut = () => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom - 0.1 });
  };

  const handleResetView = () => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_PAN', payload: { x: 0, y: 0 } });
  };

  return (
    <div className="h-11 sm:h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-2 sm:px-4 flex-shrink-0">
      {/* Left: Logo & title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xl sm:text-2xl">⚛️</span>
          <h1 className="text-sm sm:text-lg font-bold text-white hidden xs:block">React Blueprint</h1>
        </div>
        <div className="h-6 w-px bg-slate-700 hidden sm:block" />
        <span className="text-xs sm:text-sm text-slate-400 truncate max-w-[100px] sm:max-w-none hidden sm:block">
          {activeGraph?.name || 'Aucun graphe'}
        </span>
        
        {/* Panel toggles for tablet */}
        <div className="hidden sm:flex md:hidden items-center gap-1 ml-2">
          {onToggleLeftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className={`p-1.5 rounded transition-colors ${
                showLeftPanel ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Panneau gauche"
            >
              📑
            </button>
          )}
          {onToggleRightPanel && (
            <button
              onClick={onToggleRightPanel}
              className={`p-1.5 rounded transition-colors ${
                showRightPanel ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Panneau droit"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Center: View controls */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          onClick={handleZoomOut}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-sm"
          title="Zoom arrière"
        >
          ➖
        </button>
        <button
          onClick={handleResetView}
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Réinitialiser la vue"
        >
          {Math.round(state.zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-sm"
          title="Zoom avant"
        >
          ➕
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onLibrary}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1"
          title="Bibliothèque de 30 templates"
        >
          📚 <span className="hidden lg:inline">Bibliothèque</span>
        </button>
        {onPlugins && (
          <button
            onClick={onPlugins}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center gap-1"
            title="Gestionnaire de plugins"
          >
            🔌 <span className="hidden lg:inline">Plugins</span>
          </button>
        )}
        <div className="h-6 w-px bg-slate-700 hidden sm:block" />
        <button
          onClick={handleLoad}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
          title="Ouvrir"
        >
          📂 <span className="hidden xl:inline">Ouvrir</span>
        </button>
        <button
          onClick={handleSave}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
          title="Sauvegarder"
        >
          💾 <span className="hidden xl:inline">Sauvegarder</span>
        </button>
        <div className="h-6 w-px bg-slate-700 hidden sm:block" />
        <button
          onClick={onExport}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
          title="Exporter le code"
        >
          📤 <span className="hidden xl:inline">Exporter</span>
        </button>
        <button
          onClick={onPreview}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
          title="Aperçu"
        >
          ▶️ <span className="hidden lg:inline">Aperçu</span>
        </button>
        <div className="h-6 w-px bg-slate-700 hidden lg:block" />
        <button
          onClick={onHelp}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
          title="Aide et documentation"
        >
          ❓ <span className="hidden lg:inline">Aide</span>
        </button>
        
        {/* Panel toggles for desktop */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {onToggleLeftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className={`p-1.5 rounded transition-colors ${
                showLeftPanel ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={showLeftPanel ? 'Masquer panneau gauche' : 'Afficher panneau gauche'}
            >
              {showLeftPanel ? '◀' : '▶'}
            </button>
          )}
          {onToggleRightPanel && (
            <button
              onClick={onToggleRightPanel}
              className={`p-1.5 rounded transition-colors ${
                showRightPanel ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={showRightPanel ? 'Masquer panneau droit' : 'Afficher panneau droit'}
            >
              {showRightPanel ? '▶' : '◀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
