import { PortDataType, NodeCategory } from './nodes';

export interface PluginPort {
  name: string;
  type: 'input' | 'output';
  dataType: PortDataType;
}

export interface PluginNodeDef {
  id: string;
  type: string;
  label: string;
  category: NodeCategory;
  color: string;
  icon: string;
  description?: string;
  inputs: PluginPort[];
  outputs: PluginPort[];
  properties?: Record<string, unknown>;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'ui' | 'utilities' | 'charts' | 'forms' | 'custom';
  nodes: PluginNodeDef[];
  isCustom?: boolean;
}

// Marketplace plugins disponibles
export const MARKETPLACE_PLUGINS: Plugin[] = [
  {
    id: 'blueprintui-charts',
    name: '@blueprintui/charts',
    version: '1.0.0',
    description: 'Composants de graphiques interactifs',
    author: 'Blueprint Team',
    category: 'charts',
    nodes: [
      {
        id: 'chart-bar',
        type: 'plugin-chart-bar',
        label: 'Bar Chart',
        category: 'plugin',
        color: '#F59E0B',
        icon: '📊',
        description: 'Graphique à barres',
        inputs: [
          { name: 'flow', type: 'input', dataType: 'flow' },
          { name: 'data', type: 'input', dataType: 'array' },
          { name: 'labels', type: 'input', dataType: 'array' },
        ],
        outputs: [
          { name: 'element', type: 'output', dataType: 'any' },
        ],
      },
      {
        id: 'chart-line',
        type: 'plugin-chart-line',
        label: 'Line Chart',
        category: 'plugin',
        color: '#F59E0B',
        icon: '📈',
        description: 'Graphique linéaire',
        inputs: [
          { name: 'flow', type: 'input', dataType: 'flow' },
          { name: 'data', type: 'input', dataType: 'array' },
        ],
        outputs: [
          { name: 'element', type: 'output', dataType: 'any' },
        ],
      },
    ],
  },
  {
    id: 'blueprintui-forms',
    name: '@blueprintui/forms',
    version: '1.0.0',
    description: 'Composants de formulaire avancés',
    author: 'Blueprint Team',
    category: 'forms',
    nodes: [
      {
        id: 'form-select',
        type: 'plugin-form-select',
        label: 'Select',
        category: 'plugin',
        color: '#8B5CF6',
        icon: '📋',
        description: 'Menu déroulant',
        inputs: [
          { name: 'flow', type: 'input', dataType: 'flow' },
          { name: 'options', type: 'input', dataType: 'array' },
          { name: 'value', type: 'input', dataType: 'string' },
        ],
        outputs: [
          { name: 'onChange', type: 'output', dataType: 'flow' },
          { name: 'value', type: 'output', dataType: 'string' },
        ],
      },
      {
        id: 'form-checkbox',
        type: 'plugin-form-checkbox',
        label: 'Checkbox',
        category: 'plugin',
        color: '#8B5CF6',
        icon: '☑️',
        description: 'Case à cocher',
        inputs: [
          { name: 'flow', type: 'input', dataType: 'flow' },
          { name: 'checked', type: 'input', dataType: 'boolean' },
          { name: 'label', type: 'input', dataType: 'string' },
        ],
        outputs: [
          { name: 'onChange', type: 'output', dataType: 'flow' },
          { name: 'checked', type: 'output', dataType: 'boolean' },
        ],
      },
    ],
  },
  {
    id: 'blueprintui-utilities',
    name: '@blueprintui/utilities',
    version: '1.0.0',
    description: 'Utilitaires pratiques',
    author: 'Blueprint Team',
    category: 'utilities',
    nodes: [
      {
        id: 'util-debounce',
        type: 'plugin-util-debounce',
        label: 'Debounce',
        category: 'plugin',
        color: '#64748B',
        icon: '⏱️',
        description: 'Debounce une fonction',
        inputs: [
          { name: 'trigger', type: 'input', dataType: 'flow' },
          { name: 'delay', type: 'input', dataType: 'number' },
        ],
        outputs: [
          { name: 'onDebounced', type: 'output', dataType: 'flow' },
        ],
      },
      {
        id: 'util-localstorage',
        type: 'plugin-util-localstorage',
        label: 'LocalStorage',
        category: 'plugin',
        color: '#64748B',
        icon: '💾',
        description: 'Stockage local',
        inputs: [
          { name: 'key', type: 'input', dataType: 'string' },
          { name: 'value', type: 'input', dataType: 'any' },
        ],
        outputs: [
          { name: 'value', type: 'output', dataType: 'any' },
        ],
      },
    ],
  },
];

export function getPluginCategories(): string[] {
  return ['charts', 'forms', 'utilities', 'ui', 'custom'];
}
