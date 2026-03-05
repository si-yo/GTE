import React, { useState } from 'react';
import { useGraph } from '../store/GraphStore';
import { generateReactCode } from '../utils/codeGenerator';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject } = useGraph();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const graphs = activeProject?.graphs || [];
  const code = generateReactCode(graphs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GeneratedApp.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    return code.split('\n').map((line, i) => {
      let highlighted = line
        // Keywords
        .replace(
          /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|try|catch|async|await|default)\b/g,
          '<span class="text-purple-400">$1</span>'
        )
        // React specific
        .replace(
          /\b(React|useState|useEffect|useMemo|useRef|useCallback)\b/g,
          '<span class="text-blue-400">$1</span>'
        )
        // Strings
        .replace(
          /(['"`])(?:(?!\1)[^\\]|\\.)*?\1/g,
          '<span class="text-green-400">$&</span>'
        )
        // Comments
        .replace(
          /(\/\/.*$)/g,
          '<span class="text-slate-500">$1</span>'
        )
        // JSX tags
        .replace(
          /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g,
          '<span class="text-teal-400">$1</span>'
        );

      return (
        <div key={i} className="flex">
          <span className="w-12 text-right pr-4 text-slate-600 select-none">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">📤 Code Généré</h2>
            <p className="text-sm text-slate-400">React + TypeScript</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              {copied ? '✓' : '📋'} <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              💾 <span className="hidden sm:inline">Télécharger</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm font-mono text-slate-300 leading-6">
            {highlightCode(code)}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <p className="text-xs text-slate-500">
            Ce code est généré automatiquement à partir de votre graphe visuel.
            Vous pouvez le personnaliser après l'export.
          </p>
        </div>
      </div>
    </div>
  );
};
