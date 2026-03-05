import React, { useState } from 'react';
import { useGraph } from '../store/GraphStore';
import { getNodeDefinition, Port, Connection, GraphNode } from '../types/nodes';

// Helper to get color by data type
const getDataTypeColor = (dataType: string): string => {
  const colors: Record<string, string> = {
    flow: '#EF4444',
    string: '#EC4899',
    number: '#6366F1',
    boolean: '#10B981',
    array: '#F59E0B',
    object: '#8B5CF6',
    any: '#64748B',
    ref: '#14B8A6',
    state: '#06B6D4',
    effect: '#F97316',
  };
  return colors[dataType] || '#64748B';
};

// Connection info component
interface ConnectionInfoProps {
  connection: Connection;
  port: Port;
  direction: 'incoming' | 'outgoing';
  otherNode: GraphNode | undefined;
  otherPort: Port | undefined;
  onDelete: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

const ConnectionInfo: React.FC<ConnectionInfoProps> = ({
  connection: _connection,
  port,
  direction,
  otherNode,
  otherPort,
  onDelete,
  onSelect,
  isSelected,
}) => {
  const otherDef = otherNode ? getNodeDefinition(otherNode.type) : null;

  return (
    <div
      onClick={onSelect}
      className={`p-2 rounded-lg cursor-pointer transition-all ${
        isSelected ? 'bg-blue-900/50 ring-1 ring-blue-500' : 'bg-slate-700/50 hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getDataTypeColor(port.dataType) }}
          />
          <span className="text-xs text-slate-300">{port.dataType}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-400 hover:text-red-300 text-xs px-1"
          title="Supprimer cette connexion"
        >
          ✕
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        {direction === 'incoming' ? (
          <>
            <span className="text-slate-500">depuis</span>
            <span className="text-white font-medium">{otherDef?.icon} {otherDef?.label || 'N/A'}</span>
          </>
        ) : (
          <>
            <span className="text-slate-500">vers</span>
            <span className="text-white font-medium">{otherDef?.icon} {otherDef?.label || 'N/A'}</span>
          </>
        )}
      </div>
      
      <div className="text-[10px] text-slate-500 mt-1">
        {direction === 'incoming' ? (
          <>Port: {otherPort?.name} → {port.name}</>
        ) : (
          <>Port: {port.name} → {otherPort?.name}</>
        )}
      </div>

      {/* Flow indicator */}
      <div className="mt-2 flex items-center gap-1 text-[10px]">
        <span
          className="px-1.5 py-0.5 rounded"
          style={{ 
            backgroundColor: getDataTypeColor(port.dataType) + '33',
            color: getDataTypeColor(port.dataType)
          }}
        >
          {port.dataType === 'flow' ? '▶ Exécution' : `📤 ${port.dataType}`}
        </span>
      </div>
    </div>
  );
};

// Port section with connections
interface PortSectionProps {
  port: Port;
  connections: Connection[];
  direction: 'input' | 'output';
  allNodes: GraphNode[];
  activeGraphId: string;
  selectedConnectionId: string | null;
  dispatch: React.Dispatch<any>;
}

const PortSection: React.FC<PortSectionProps> = ({
  port,
  connections,
  direction,
  allNodes,
  activeGraphId,
  selectedConnectionId,
  dispatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Find connections for this port
  const portConnections = connections.filter((c) =>
    direction === 'input'
      ? c.toPort === port.id
      : c.fromPort === port.id
  );

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ 
              borderColor: getDataTypeColor(port.dataType),
              backgroundColor: portConnections.length > 0 ? getDataTypeColor(port.dataType) : 'transparent'
            }}
          />
          <span className="text-sm text-white">{port.name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: getDataTypeColor(port.dataType) + '22',
              color: getDataTypeColor(port.dataType)
            }}
          >
            {port.dataType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {portConnections.length > 0 && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
              {portConnections.length}
            </span>
          )}
          <span className="text-slate-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-2 bg-slate-900/50">
          {portConnections.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-2">
              {direction === 'input' ? 'Aucune connexion entrante' : 'Aucune connexion sortante'}
            </p>
          ) : (
            portConnections.map((conn) => {
              const otherNodeId = direction === 'input' ? conn.fromNode : conn.toNode;
              const otherPortId = direction === 'input' ? conn.fromPort : conn.toPort;
              const otherNode = allNodes.find((n) => n.id === otherNodeId);
              const otherPort = direction === 'input'
                ? otherNode?.outputs.find((p) => p.id === otherPortId)
                : otherNode?.inputs.find((p) => p.id === otherPortId);

              return (
                <ConnectionInfo
                  key={conn.id}
                  connection={conn}
                  port={port}
                  direction={direction === 'input' ? 'incoming' : 'outgoing'}
                  otherNode={otherNode}
                  otherPort={otherPort}
                  isSelected={selectedConnectionId === conn.id}
                  onSelect={() => dispatch({ type: 'SELECT_CONNECTION', payload: conn.id })}
                  onDelete={() => dispatch({
                    type: 'DELETE_CONNECTION',
                    payload: { graphId: activeGraphId, connectionId: conn.id },
                  })}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const { dispatch, activeGraph, selectedNode, deleteSelectedNode, duplicateNode, state } = useGraph();
  const [activeTab, setActiveTab] = useState<'properties' | 'connections'>('properties');

  // Show connection info if a connection is selected
  if (state.selectedConnectionId && activeGraph) {
    const connection = activeGraph.connections.find(c => c.id === state.selectedConnectionId);
    if (connection) {
      const fromNode = activeGraph.nodes.find(n => n.id === connection.fromNode);
      const toNode = activeGraph.nodes.find(n => n.id === connection.toNode);
      const fromPort = fromNode?.outputs.find(p => p.id === connection.fromPort);
      const toPort = toNode?.inputs.find(p => p.id === connection.toPort);
      const fromDef = fromNode ? getNodeDefinition(fromNode.type) : null;
      const toDef = toNode ? getNodeDefinition(toNode.type) : null;

      return (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full min-w-[320px] overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔗 Connexion sélectionnée
            </h2>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Flow type indicator */}
              <div className="flex justify-center">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: getDataTypeColor(fromPort?.dataType || 'any') + '22',
                    color: getDataTypeColor(fromPort?.dataType || 'any')
                  }}
                >
                  {fromPort?.dataType === 'flow' ? '▶ Flow d\'exécution' : `📤 Donnée: ${fromPort?.dataType}`}
                </span>
              </div>

              {/* From Node */}
              <div className="p-3 bg-slate-800 rounded-lg border-l-4" style={{ borderColor: fromDef?.color }}>
                <p className="text-xs text-slate-500 mb-1">Source</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <span>{fromDef?.icon}</span>
                  <span className="font-medium">{fromDef?.label || 'N/A'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getDataTypeColor(fromPort?.dataType || 'any') }}
                  />
                  <span className="text-xs text-slate-400">Port: {fromPort?.name}</span>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <span
                    className="text-2xl"
                    style={{ color: getDataTypeColor(fromPort?.dataType || 'any') }}
                  >
                    ↓
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {fromPort?.dataType === 'flow' ? 'Exécute' : 'Transmet'}
                  </span>
                </div>
              </div>
              
              {/* To Node */}
              <div className="p-3 bg-slate-800 rounded-lg border-l-4" style={{ borderColor: toDef?.color }}>
                <p className="text-xs text-slate-500 mb-1">Destination</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <span>{toDef?.icon}</span>
                  <span className="font-medium">{toDef?.label || 'N/A'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getDataTypeColor(toPort?.dataType || 'any') }}
                  />
                  <span className="text-xs text-slate-400">Port: {toPort?.name}</span>
                </div>
              </div>

              {/* Flow explanation */}
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-xs text-blue-400 font-medium mb-1">💡 Ce que fait cette connexion</p>
                <p className="text-xs text-slate-300">
                  {fromPort?.dataType === 'flow' ? (
                    <>Quand <strong>{fromDef?.label}</strong> déclenche "{fromPort?.name}", 
                    l'exécution passe à <strong>{toDef?.label}</strong> via "{toPort?.name}".</>
                  ) : (
                    <>La valeur de "{fromPort?.name}" ({fromPort?.dataType}) de <strong>{fromDef?.label}</strong> est 
                    transmise à "{toPort?.name}" de <strong>{toDef?.label}</strong>.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-700 flex-shrink-0 space-y-2">
            <button
              onClick={() => {
                if (fromNode) {
                  dispatch({ type: 'SELECT_NODE', payload: fromNode.id });
                }
              }}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              📍 Aller au nœud source
            </button>
            <button
              onClick={() => {
                if (toNode) {
                  dispatch({ type: 'SELECT_NODE', payload: toNode.id });
                }
              }}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              📍 Aller au nœud destination
            </button>
            <button
              onClick={() => {
                dispatch({
                  type: 'DELETE_CONNECTION',
                  payload: { graphId: activeGraph.id, connectionId: state.selectedConnectionId! },
                });
              }}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              🗑️ Supprimer la connexion
            </button>
          </div>
        </div>
      );
    }
  }

  if (!selectedNode) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-700 p-4 min-w-[320px] overflow-auto">
        <h2 className="text-lg font-bold text-white mb-4">⚙️ Propriétés</h2>
        <p className="text-slate-500 text-sm">
          Sélectionnez un nœud pour voir ses propriétés
        </p>

        {/* Graph info */}
        {activeGraph && (
          <div className="mt-6 p-3 bg-slate-800 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">📊 Graph actuel</h3>
            <p className="text-sm text-white mb-1">{activeGraph.name}</p>
            <p className="text-xs text-slate-500">
              {activeGraph.nodes.length} nœuds • {activeGraph.connections.length} connexions
            </p>
          </div>
        )}

        {/* Quick help */}
        <div className="mt-6 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Aide rapide</h3>
          <div className="text-xs text-slate-300 space-y-2">
            <p><strong>Créer une connexion:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Cliquez sur un port de sortie (droite)</li>
              <li>Maintenez et glissez</li>
              <li>Relâchez sur un port d'entrée (gauche)</li>
            </ol>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">⌨️ Raccourcis</h3>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
              <span>Supprimer</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300">Delete</kbd>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
              <span>Annuler connexion</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300">Esc</kbd>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
              <span>Déplacer canvas</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300">Alt + Drag</kbd>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
              <span>Zoom</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300">Scroll</kbd>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const def = getNodeDefinition(selectedNode.type);
  if (!def) return null;

  const updateProperty = (name: string, value: unknown) => {
    if (!activeGraph) return;
    dispatch({
      type: 'UPDATE_NODE',
      payload: {
        graphId: activeGraph.id,
        nodeId: selectedNode.id,
        updates: {
          properties: { ...selectedNode.properties, [name]: value },
        },
      },
    });
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full min-w-[320px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{def.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate">{def.label}</h2>
            <p className="text-xs text-slate-500 truncate">{selectedNode.type}</p>
          </div>
        </div>
        <div
          className="w-full h-1.5 rounded-full mt-2"
          style={{ backgroundColor: def.color }}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'properties'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🔧 Propriétés
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'connections'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🔗 Connexions
          {activeGraph && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
              {activeGraph.connections.filter(
                c => c.fromNode === selectedNode.id || c.toNode === selectedNode.id
              ).length}
            </span>
          )}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'properties' && (
          <>
            {/* Position */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">📍 Position</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">X</label>
                  <input
                    type="number"
                    value={selectedNode.x}
                    onChange={(e) => {
                      if (!activeGraph) return;
                      dispatch({
                        type: 'UPDATE_NODE',
                        payload: {
                          graphId: activeGraph.id,
                          nodeId: selectedNode.id,
                          updates: { x: parseInt(e.target.value) || 0 },
                        },
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Y</label>
                  <input
                    type="number"
                    value={selectedNode.y}
                    onChange={(e) => {
                      if (!activeGraph) return;
                      dispatch({
                        type: 'UPDATE_NODE',
                        payload: {
                          graphId: activeGraph.id,
                          nodeId: selectedNode.id,
                          updates: { y: parseInt(e.target.value) || 0 },
                        },
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Node properties */}
            {def.properties && def.properties.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">🔧 Configuration</h3>
                <div className="space-y-4">
                  {def.properties.map((prop) => (
                    <div key={prop.name}>
                      <label className="text-xs text-slate-500 capitalize block mb-1">{prop.name}</label>
                      {prop.type === 'string' && (
                        <input
                          type="text"
                          value={selectedNode.properties[prop.name] ?? prop.default ?? ''}
                          onChange={(e) => updateProperty(prop.name, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      )}
                      {prop.type === 'number' && (
                        <input
                          type="number"
                          value={selectedNode.properties[prop.name] ?? prop.default ?? 0}
                          onChange={(e) => updateProperty(prop.name, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      )}
                      {prop.type === 'boolean' && (
                        <label className="flex items-center gap-3 cursor-pointer p-2 bg-slate-800 rounded-lg">
                          <input
                            type="checkbox"
                            checked={selectedNode.properties[prop.name] ?? prop.default ?? false}
                            onChange={(e) => updateProperty(prop.name, e.target.checked)}
                            className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-slate-300">Activé</span>
                        </label>
                      )}
                      {prop.type === 'select' && (
                        <select
                          value={selectedNode.properties[prop.name] ?? prop.default ?? ''}
                          onChange={(e) => updateProperty(prop.name, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          {prop.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                      {prop.type === 'color' && (
                        <input
                          type="color"
                          value={selectedNode.properties[prop.name] ?? prop.default ?? '#ffffff'}
                          onChange={(e) => updateProperty(prop.name, e.target.value)}
                          className="w-full h-10 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Node ID (for debugging) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">🔑 Identifiant</h3>
              <p className="text-xs text-slate-600 font-mono bg-slate-800 p-2 rounded-lg break-all">{selectedNode.id}</p>
            </div>
          </>
        )}

        {activeTab === 'connections' && activeGraph && (
          <div className="space-y-6">
            {/* Inputs */}
            {selectedNode.inputs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500" />
                  Entrées ({selectedNode.inputs.length})
                </h3>
                <div className="space-y-2">
                  {selectedNode.inputs.map((port) => (
                    <PortSection
                      key={port.id}
                      port={port}
                      connections={activeGraph.connections}
                      direction="input"
                      allNodes={activeGraph.nodes}
                      activeGraphId={activeGraph.id}
                      selectedConnectionId={state.selectedConnectionId}
                      dispatch={dispatch}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Outputs */}
            {selectedNode.outputs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500/30 border border-orange-500" />
                  Sorties ({selectedNode.outputs.length})
                </h3>
                <div className="space-y-2">
                  {selectedNode.outputs.map((port) => (
                    <PortSection
                      key={port.id}
                      port={port}
                      connections={activeGraph.connections}
                      direction="output"
                      allNodes={activeGraph.nodes}
                      activeGraphId={activeGraph.id}
                      selectedConnectionId={state.selectedConnectionId}
                      dispatch={dispatch}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-3 bg-slate-800 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">📊 Résumé</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-700 rounded text-center">
                  <p className="text-lg font-bold text-green-400">
                    {activeGraph.connections.filter(c => c.toNode === selectedNode.id).length}
                  </p>
                  <p className="text-slate-400">Entrantes</p>
                </div>
                <div className="p-2 bg-slate-700 rounded text-center">
                  <p className="text-lg font-bold text-orange-400">
                    {activeGraph.connections.filter(c => c.fromNode === selectedNode.id).length}
                  </p>
                  <p className="text-slate-400">Sortantes</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions - fixed at bottom */}
      <div className="p-4 border-t border-slate-700 space-y-2 flex-shrink-0">
        <button
          onClick={() => duplicateNode(selectedNode)}
          className="w-full px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          📋 Dupliquer
        </button>
        <button
          onClick={deleteSelectedNode}
          className="w-full px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
};
