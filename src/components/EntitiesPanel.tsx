import React, { useState } from 'react';
import { useGraph } from '../store/GraphStore';
import { Entity, EntityAttribute } from '../types/nodes';

export const EntitiesPanel: React.FC = () => {
  const { entities, dispatch } = useGraph();
  const [newEntityName, setNewEntityName] = useState('');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState<EntityAttribute['type']>('string');

  const handleAddEntity = () => {
    if (!newEntityName.trim()) return;

    const entity: Entity = {
      id: `entity_${Date.now()}`,
      name: newEntityName,
      attributes: [],
      methods: [],
    };

    dispatch({ type: 'ADD_ENTITY', payload: entity });
    setNewEntityName('');
  };

  const handleAddAttribute = (entityId: string) => {
    if (!newAttrName.trim()) return;

    const entity = entities.find((e: Entity) => e.id === entityId);
    if (!entity) return;

    const attr: EntityAttribute = {
      id: `attr_${Date.now()}`,
      name: newAttrName,
      type: newAttrType,
    };

    dispatch({
      type: 'UPDATE_ENTITY',
      payload: {
        entityId,
        updates: { attributes: [...entity.attributes, attr] },
      },
    });

    setNewAttrName('');
  };

  const handleDeleteAttribute = (entityId: string, attrId: string) => {
    const entity = entities.find((e: Entity) => e.id === entityId);
    if (!entity) return;

    dispatch({
      type: 'UPDATE_ENTITY',
      payload: {
        entityId,
        updates: { attributes: entity.attributes.filter((a: EntityAttribute) => a.id !== attrId) },
      },
    });
  };

  const typeColors: Record<string, string> = {
    string: '#EC4899',
    number: '#6366F1',
    boolean: '#10B981',
    array: '#F59E0B',
    object: '#14B8A6',
    ref: '#8B5CF6',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-base font-bold text-white mb-2">🏗️ Entités</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nom de l'entité..."
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEntity()}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAddEntity}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex-shrink-0"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {entities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Aucune entité créée</p>
            <p className="text-slate-600 text-xs mt-2">
              Les entités sont comme des classes avec des attributs et méthodes.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entities.map((entity: Entity) => (
              <div
                key={entity.id}
                className="bg-slate-800 rounded-lg overflow-hidden"
              >
                {/* Entity header */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() =>
                    setExpandedEntity(expandedEntity === entity.id ? null : entity.id)
                  }
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-teal-400 flex-shrink-0">📦</span>
                    <span className="text-sm font-medium text-white truncate">{entity.name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      ({entity.attributes.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'DELETE_ENTITY', payload: entity.id });
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                    <span
                      className={`transition-transform text-slate-400 ${
                        expandedEntity === entity.id ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                  </div>
                </div>

                {/* Entity content */}
                {expandedEntity === entity.id && (
                  <div className="px-3 pb-3 border-t border-slate-700">
                    {/* Attributes */}
                    <div className="mt-2 space-y-1">
                      {entity.attributes.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">Aucun attribut</p>
                      ) : (
                        entity.attributes.map((attr: EntityAttribute) => (
                          <div
                            key={attr.id}
                            className="flex items-center justify-between p-2 bg-slate-900 rounded"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: typeColors[attr.type] }}
                              />
                              <span className="text-sm text-slate-300 truncate">{attr.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${typeColors[attr.type]}20`,
                                  color: typeColors[attr.type],
                                }}
                              >
                                {attr.type}
                              </span>
                              <button
                                onClick={() => handleDeleteAttribute(entity.id, attr.id)}
                                className="text-xs text-slate-500 hover:text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add attribute */}
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Nom de l'attribut..."
                        value={newAttrName}
                        onChange={(e) => setNewAttrName(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newAttrType}
                          onChange={(e) => setNewAttrType(e.target.value as EntityAttribute['type'])}
                          className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="array">array</option>
                          <option value="object">object</option>
                          <option value="ref">ref</option>
                        </select>
                        <button
                          onClick={() => handleAddAttribute(entity.id)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm flex-shrink-0"
                        >
                          + Ajouter
                        </button>
                      </div>
                    </div>

                    {/* Drag hint */}
                    <p className="mt-3 text-xs text-slate-500">
                      Utilisez les nœuds "Entity" dans le canvas pour interagir avec cette entité.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
