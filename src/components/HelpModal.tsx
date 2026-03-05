import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTab = 'getting-started' | 'connections' | 'nodes' | 'entities' | 'shortcuts';

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('getting-started');

  if (!isOpen) return null;

  const tabs: { id: HelpTab; label: string; icon: string }[] = [
    { id: 'getting-started', label: 'Démarrage', icon: '🚀' },
    { id: 'connections', label: 'Connexions', icon: '🔗' },
    { id: 'nodes', label: 'Nœuds', icon: '📦' },
    { id: 'entities', label: 'Entités', icon: '🏗️' },
    { id: 'shortcuts', label: 'Raccourcis', icon: '⌨️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📖 Documentation & Aide
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'getting-started' && <GettingStartedContent />}
          {activeTab === 'connections' && <ConnectionsContent />}
          {activeTab === 'nodes' && <NodesContent />}
          {activeTab === 'entities' && <EntitiesContent />}
          {activeTab === 'shortcuts' && <ShortcutsContent />}
        </div>
      </div>
    </div>
  );
};

const GettingStartedContent: React.FC = () => (
  <div className="space-y-6 text-slate-300">
    <section>
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        🎯 Bienvenue dans React Visual Builder
      </h3>
      <p className="mb-4">
        Cet outil vous permet de créer des applications React/TypeScript sans écrire de code, 
        en utilisant uniquement des graphes visuels et des connexions entre nœuds.
      </p>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-2">📋 Étapes de base</h4>
      <ol className="list-decimal list-inside space-y-2 ml-2">
        <li><strong>Glissez des nœuds</strong> depuis le panneau de gauche vers le canvas</li>
        <li><strong>Connectez les ports</strong> en cliquant sur un port de sortie (droite) puis sur un port d'entrée (gauche)</li>
        <li><strong>Configurez les propriétés</strong> dans le panneau de droite</li>
        <li><strong>Exportez votre code</strong> une fois terminé</li>
      </ol>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-2">🖼️ Interface</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-slate-800 rounded-lg">
          <p className="font-semibold text-blue-400 mb-1">← Panneau Gauche</p>
          <p className="text-sm">Nœuds disponibles, entités et composants</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          <p className="font-semibold text-green-400 mb-1">↔ Canvas Central</p>
          <p className="text-sm">Votre graphe visuel de nœuds</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">
          <p className="font-semibold text-purple-400 mb-1">Panneau Droit →</p>
          <p className="text-sm">Propriétés du nœud sélectionné</p>
        </div>
      </div>
    </section>

    <section className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
      <h4 className="text-md font-semibold text-blue-400 mb-2">💡 Conseil</h4>
      <p className="text-sm">
        Commencez par un nœud <strong>"Start"</strong> (catégorie Event) qui représente le point d'entrée 
        de votre composant, puis connectez-y des hooks comme <strong>useState</strong> et des éléments UI.
      </p>
    </section>
  </div>
);

const ConnectionsContent: React.FC = () => (
  <div className="space-y-6 text-slate-300">
    <section>
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        🔗 Comment connecter les nœuds
      </h3>
      <p className="mb-4">
        Les connexions représentent le flux de données et d'exécution entre les nœuds.
      </p>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-3">📍 Les Ports</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-slate-800 rounded-lg border-l-4 border-green-500">
          <p className="font-semibold text-green-400 mb-2">⬤ Ports d'entrée (gauche)</p>
          <p className="text-sm">Reçoivent des données ou des flux d'exécution depuis d'autres nœuds.</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg border-l-4 border-orange-500">
          <p className="font-semibold text-orange-400 mb-2">⬤ Ports de sortie (droite)</p>
          <p className="text-sm">Envoient des données ou déclenchent l'exécution vers d'autres nœuds.</p>
        </div>
      </div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-3">🎯 Créer une connexion</h4>
      <div className="bg-slate-800 rounded-lg p-4">
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">1</span>
            <div>
              <p className="font-medium">Cliquez sur un port de sortie</p>
              <p className="text-sm text-slate-400">Les ports de sortie sont à droite du nœud (cercles orange/colorés)</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">2</span>
            <div>
              <p className="font-medium">Maintenez et glissez vers un port d'entrée</p>
              <p className="text-sm text-slate-400">Une ligne temporaire apparaît pour visualiser la connexion</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">3</span>
            <div>
              <p className="font-medium">Relâchez sur le port d'entrée cible</p>
              <p className="text-sm text-slate-400">La connexion est créée si les types sont compatibles</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-3">📊 Types de données</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { type: 'flow', color: '#EF4444', desc: 'Flux d\'exécution' },
          { type: 'string', color: '#EC4899', desc: 'Texte' },
          { type: 'number', color: '#6366F1', desc: 'Nombre' },
          { type: 'boolean', color: '#10B981', desc: 'Vrai/Faux' },
          { type: 'array', color: '#F59E0B', desc: 'Liste' },
          { type: 'object', color: '#8B5CF6', desc: 'Objet' },
          { type: 'any', color: '#64748B', desc: 'Tout type' },
          { type: 'state', color: '#14B8A6', desc: 'État React' },
        ].map(({ type, color, desc }) => (
          <div key={type} className="p-2 bg-slate-800 rounded-lg text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
            <p className="text-xs font-mono text-slate-300">{type}</p>
            <p className="text-[10px] text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-3">⚠️ Règles de connexion</h4>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Sortie → Entrée uniquement (pas l'inverse)
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Un port d'entrée ne peut avoir qu'une seule connexion
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Un port de sortie peut avoir plusieurs connexions
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Les types "any" sont compatibles avec tous les types
        </li>
        <li className="flex items-center gap-2">
          <span className="text-yellow-400">!</span>
          Les connexions "flow" définissent l'ordre d'exécution
        </li>
      </ul>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-3">🗑️ Supprimer une connexion</h4>
      <p className="text-sm">
        Cliquez sur une connexion pour la sélectionner, puis appuyez sur <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Delete</kbd> ou 
        utilisez le bouton "Supprimer" dans le panneau de propriétés.
      </p>
    </section>

    <section className="p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
      <h4 className="text-md font-semibold text-amber-400 mb-2">🔄 Flux de données</h4>
      <p className="text-sm">
        Les connexions de type <strong>flow</strong> (rouge) déterminent l'ordre d'exécution du code généré.
        Les autres types (string, number, etc.) représentent des valeurs qui sont passées entre les nœuds.
      </p>
    </section>
  </div>
);

const NodesContent: React.FC = () => (
  <div className="space-y-6 text-slate-300">
    <section>
      <h3 className="text-lg font-bold text-white mb-3">📦 Types de nœuds</h3>
    </section>

    <section>
      <h4 className="text-md font-semibold text-blue-400 mb-2">🔘 UI - Interface utilisateur</h4>
      <p className="text-sm mb-2">Créez des éléments visuels : boutons, inputs, textes, images, listes...</p>
      <div className="text-xs text-slate-500">Button, Input, Text, Container, Image, List</div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-purple-400 mb-2">🔄 Hooks React</h4>
      <p className="text-sm mb-2">Gérez l'état et les effets de votre composant.</p>
      <ul className="text-sm space-y-1 ml-4">
        <li><strong>useState</strong> - État local avec valeur et setter</li>
        <li><strong>useRef</strong> - Référence persistante</li>
        <li><strong>useMemo</strong> - Valeur mémorisée</li>
        <li><strong>useEffect</strong> - Effets de bord (mount, update, cleanup)</li>
        <li><strong>useCallback</strong> - Fonction mémorisée</li>
      </ul>
    </section>

    <section>
      <h4 className="text-md font-semibold text-yellow-400 mb-2">🌐 Async - Opérations asynchrones</h4>
      <p className="text-sm mb-2">Gérez les appels API et les délais.</p>
      <ul className="text-sm space-y-1 ml-4">
        <li><strong>Fetch API</strong> - Appels HTTP avec gestion succès/erreur</li>
        <li><strong>Delay</strong> - Attente temporisée</li>
        <li><strong>Promise</strong> - Gestion de promesses</li>
      </ul>
    </section>

    <section>
      <h4 className="text-md font-semibold text-green-400 mb-2">🔀 Logic - Logique conditionnelle</h4>
      <p className="text-sm mb-2">Contrôlez le flux d'exécution.</p>
      <ul className="text-sm space-y-1 ml-4">
        <li><strong>If/Else</strong> - Branchement conditionnel</li>
        <li><strong>Switch</strong> - Choix multiples</li>
        <li><strong>For Each</strong> - Boucle sur tableau</li>
        <li><strong>Compare</strong> - Comparaison de valeurs</li>
        <li><strong>AND/OR/NOT</strong> - Opérateurs logiques</li>
      </ul>
    </section>

    <section>
      <h4 className="text-md font-semibold text-pink-400 mb-2">📝 Data - Données</h4>
      <p className="text-sm mb-2">Créez et manipulez des valeurs.</p>
      <div className="text-xs text-slate-500">String, Number, Boolean, Array, Object, Get/Set Property, Concat</div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-indigo-400 mb-2">➕ Math - Opérations mathématiques</h4>
      <div className="text-xs text-slate-500">Add, Subtract, Multiply, Divide</div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-teal-400 mb-2">🏗️ Entity - Gestion d'entités</h4>
      <p className="text-sm mb-2">Créez et manipulez des objets métier.</p>
      <div className="text-xs text-slate-500">Create Entity, Get/Set Attribute, Call Method</div>
    </section>
  </div>
);

const EntitiesContent: React.FC = () => (
  <div className="space-y-6 text-slate-300">
    <section>
      <h3 className="text-lg font-bold text-white mb-3">🏗️ Système d'entités</h3>
      <p>
        Les entités sont comme des classes/modèles que vous définissez avec des attributs et des méthodes.
      </p>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-2">📋 Créer une entité</h4>
      <ol className="list-decimal list-inside space-y-2 ml-2 text-sm">
        <li>Allez dans l'onglet "Entités" du panneau gauche</li>
        <li>Cliquez sur "Nouvelle entité"</li>
        <li>Donnez un nom à votre entité (ex: "User", "Product")</li>
        <li>Ajoutez des attributs avec leur type</li>
      </ol>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-2">🔧 Types d'attributs</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-slate-800 rounded">string - Texte</div>
        <div className="p-2 bg-slate-800 rounded">number - Nombre</div>
        <div className="p-2 bg-slate-800 rounded">boolean - Vrai/Faux</div>
        <div className="p-2 bg-slate-800 rounded">array - Liste</div>
        <div className="p-2 bg-slate-800 rounded">object - Objet</div>
        <div className="p-2 bg-slate-800 rounded">ref - Référence</div>
      </div>
    </section>

    <section>
      <h4 className="text-md font-semibold text-white mb-2">⚙️ Utiliser une entité</h4>
      <p className="text-sm mb-2">
        Utilisez les nœuds de la catégorie "Entity" pour manipuler vos entités dans le graphe :
      </p>
      <ul className="text-sm space-y-1 ml-4">
        <li><strong>Create Entity</strong> - Crée une nouvelle instance</li>
        <li><strong>Get Attribute</strong> - Lit un attribut</li>
        <li><strong>Set Attribute</strong> - Modifie un attribut</li>
        <li><strong>Call Method</strong> - Appelle une méthode</li>
      </ul>
    </section>
  </div>
);

const ShortcutsContent: React.FC = () => (
  <div className="space-y-4 text-slate-300">
    <section>
      <h3 className="text-lg font-bold text-white mb-3">⌨️ Raccourcis clavier</h3>
    </section>

    <div className="space-y-2">
      {[
        { key: 'Delete / Backspace', action: 'Supprimer le nœud ou la connexion sélectionné(e)' },
        { key: 'Escape', action: 'Annuler la connexion en cours / Désélectionner' },
        { key: 'Alt + Drag', action: 'Déplacer le canvas (pan)' },
        { key: 'Scroll (molette)', action: 'Zoomer / Dézoomer' },
        { key: 'Ctrl + S', action: 'Sauvegarder (à venir)' },
        { key: 'Ctrl + Z', action: 'Annuler (à venir)' },
      ].map(({ key, action }) => (
        <div key={key} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <span className="text-sm text-slate-300">{action}</span>
          <kbd className="px-3 py-1 bg-slate-700 rounded text-sm text-white font-mono">{key}</kbd>
        </div>
      ))}
    </div>

    <section className="mt-6">
      <h4 className="text-md font-semibold text-white mb-2">🖱️ Actions souris</h4>
      <div className="space-y-2">
        {[
          { action: 'Sélectionner un nœud', mouse: 'Clic gauche sur le nœud' },
          { action: 'Déplacer un nœud', mouse: 'Drag sur le nœud' },
          { action: 'Créer une connexion', mouse: 'Drag depuis un port' },
          { action: 'Sélectionner une connexion', mouse: 'Clic sur la ligne' },
          { action: 'Menu contextuel', mouse: 'Clic droit (à venir)' },
        ].map(({ action, mouse }) => (
          <div key={action} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-300">{action}</span>
            <span className="text-sm text-slate-400">{mouse}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);
