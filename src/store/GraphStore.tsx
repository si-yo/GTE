import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { GraphNode, Connection, Graph, Entity, getNodeDefinition, Port } from '../types/nodes';
import { Plugin } from '../types/plugins';

export interface Project {
  id: string;
  name: string;
  graphs: Graph[];
  activeGraphId: string;
  entities: Entity[];
  modified: boolean;
  installedPlugins: Plugin[];
}

interface GraphState {
  projects: Project[];
  activeProjectId: string;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  connectingFrom: { nodeId: string; portId: string } | null;
  zoom: number;
  panX: number;
  panY: number;
  clipboard: GraphNode | null;
}

type Action =
  | { type: 'ADD_NODE'; payload: { graphId: string; node: GraphNode } }
  | { type: 'UPDATE_NODE'; payload: { graphId: string; nodeId: string; updates: Partial<GraphNode> } }
  | { type: 'DELETE_NODE'; payload: { graphId: string; nodeId: string } }
  | { type: 'ADD_CONNECTION'; payload: { graphId: string; connection: Connection } }
  | { type: 'DELETE_CONNECTION'; payload: { graphId: string; connectionId: string } }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'SELECT_CONNECTION'; payload: string | null }
  | { type: 'SET_CONNECTING_FROM'; payload: { nodeId: string; portId: string } | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'ADD_GRAPH'; payload: Graph }
  | { type: 'DELETE_GRAPH'; payload: string }
  | { type: 'SET_ACTIVE_GRAPH'; payload: string }
  | { type: 'ADD_ENTITY'; payload: Entity }
  | { type: 'UPDATE_ENTITY'; payload: { entityId: string; updates: Partial<Entity> } }
  | { type: 'DELETE_ENTITY'; payload: string }
  | { type: 'COPY_NODE'; payload: GraphNode }
  | { type: 'LOAD_STATE'; payload: GraphState }
  // New project actions
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'SET_ACTIVE_PROJECT'; payload: string }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'RENAME_PROJECT'; payload: { projectId: string; name: string } }
  | { type: 'CLEAR_PROJECT'; payload: string }
  | { type: 'LOAD_PROJECT'; payload: { projectId: string; graphs: Graph[]; entities: Entity[] } }
  // Plugin actions
  | { type: 'INSTALL_PLUGIN'; payload: Plugin }
  | { type: 'UNINSTALL_PLUGIN'; payload: string };

const createDefaultProject = (id: string, name: string): Project => ({
  id,
  name,
  graphs: [
    {
      id: 'main',
      name: 'Main Component',
      nodes: [],
      connections: [],
    },
  ],
  activeGraphId: 'main',
  entities: [],
  modified: false,
  installedPlugins: [],
});

const initialState: GraphState = {
  projects: [createDefaultProject('project_1', 'Projet 1')],
  activeProjectId: 'project_1',
  selectedNodeId: null,
  selectedConnectionId: null,
  connectingFrom: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  clipboard: null,
};

function getActiveProject(state: GraphState): Project | undefined {
  return state.projects.find(p => p.id === state.activeProjectId);
}

function updateActiveProject(state: GraphState, updater: (project: Project) => Project): GraphState {
  return {
    ...state,
    projects: state.projects.map(p =>
      p.id === state.activeProjectId ? { ...updater(p), modified: true } : p
    ),
  };
}

function reducer(state: GraphState, action: Action): GraphState {
  switch (action.type) {
    case 'ADD_NODE': {
      return updateActiveProject(state, project => ({
        ...project,
        graphs: project.graphs.map(g =>
          g.id === action.payload.graphId
            ? { ...g, nodes: [...g.nodes, action.payload.node] }
            : g
        ),
      }));
    }
    case 'UPDATE_NODE': {
      return updateActiveProject(state, project => ({
        ...project,
        graphs: project.graphs.map(g =>
          g.id === action.payload.graphId
            ? {
                ...g,
                nodes: g.nodes.map(n =>
                  n.id === action.payload.nodeId
                    ? { ...n, ...action.payload.updates }
                    : n
                ),
              }
            : g
        ),
      }));
    }
    case 'DELETE_NODE': {
      return {
        ...updateActiveProject(state, project => ({
          ...project,
          graphs: project.graphs.map(g =>
            g.id === action.payload.graphId
              ? {
                  ...g,
                  nodes: g.nodes.filter(n => n.id !== action.payload.nodeId),
                  connections: g.connections.filter(
                    c => c.fromNode !== action.payload.nodeId && c.toNode !== action.payload.nodeId
                  ),
                }
              : g
          ),
        })),
        selectedNodeId:
          state.selectedNodeId === action.payload.nodeId ? null : state.selectedNodeId,
      };
    }
    case 'ADD_CONNECTION': {
      const project = getActiveProject(state);
      if (!project) return state;
      
      const graph = project.graphs.find(g => g.id === action.payload.graphId);
      if (!graph) return state;
      
      // Check if connection already exists
      const exists = graph.connections.some(
        c =>
          c.toNode === action.payload.connection.toNode &&
          c.toPort === action.payload.connection.toPort
      );
      if (exists) return state;

      return {
        ...updateActiveProject(state, proj => ({
          ...proj,
          graphs: proj.graphs.map(g =>
            g.id === action.payload.graphId
              ? { ...g, connections: [...g.connections, action.payload.connection] }
              : g
          ),
        })),
        connectingFrom: null,
      };
    }
    case 'DELETE_CONNECTION': {
      return {
        ...updateActiveProject(state, project => ({
          ...project,
          graphs: project.graphs.map(g =>
            g.id === action.payload.graphId
              ? {
                  ...g,
                  connections: g.connections.filter(c => c.id !== action.payload.connectionId),
                }
              : g
          ),
        })),
        selectedConnectionId: null,
      };
    }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload, selectedConnectionId: null };
    case 'SELECT_CONNECTION':
      return { ...state, selectedConnectionId: action.payload, selectedNodeId: null };
    case 'SET_CONNECTING_FROM':
      return { ...state, connectingFrom: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(2, action.payload)) };
    case 'SET_PAN':
      return { ...state, panX: action.payload.x, panY: action.payload.y };
    case 'ADD_GRAPH':
      return updateActiveProject(state, project => ({
        ...project,
        graphs: [...project.graphs, action.payload],
        activeGraphId: action.payload.id,
      }));
    case 'DELETE_GRAPH': {
      const project = getActiveProject(state);
      if (!project || project.graphs.length <= 1) return state;
      return updateActiveProject(state, proj => ({
        ...proj,
        graphs: proj.graphs.filter(g => g.id !== action.payload),
        activeGraphId: proj.activeGraphId === action.payload ? proj.graphs[0].id : proj.activeGraphId,
      }));
    }
    case 'SET_ACTIVE_GRAPH':
      return {
        ...updateActiveProject(state, project => ({
          ...project,
          activeGraphId: action.payload,
        })),
        selectedNodeId: null,
      };
    case 'ADD_ENTITY':
      return updateActiveProject(state, project => ({
        ...project,
        entities: [...project.entities, action.payload],
      }));
    case 'UPDATE_ENTITY':
      return updateActiveProject(state, project => ({
        ...project,
        entities: project.entities.map(e =>
          e.id === action.payload.entityId ? { ...e, ...action.payload.updates } : e
        ),
      }));
    case 'DELETE_ENTITY':
      return updateActiveProject(state, project => ({
        ...project,
        entities: project.entities.filter(e => e.id !== action.payload),
      }));
    case 'COPY_NODE':
      return { ...state, clipboard: action.payload };
    case 'LOAD_STATE':
      return action.payload;
    
    // New project actions
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload],
        activeProjectId: action.payload.id,
        selectedNodeId: null,
        selectedConnectionId: null,
        zoom: 1,
        panX: 0,
        panY: 0,
      };
    case 'SET_ACTIVE_PROJECT':
      return {
        ...state,
        activeProjectId: action.payload,
        selectedNodeId: null,
        selectedConnectionId: null,
        zoom: 1,
        panX: 0,
        panY: 0,
      };
    case 'DELETE_PROJECT': {
      if (state.projects.length <= 1) return state;
      const remainingProjects = state.projects.filter(p => p.id !== action.payload);
      return {
        ...state,
        projects: remainingProjects,
        activeProjectId: state.activeProjectId === action.payload 
          ? remainingProjects[0].id 
          : state.activeProjectId,
        selectedNodeId: null,
        selectedConnectionId: null,
      };
    }
    case 'RENAME_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.projectId ? { ...p, name: action.payload.name } : p
        ),
      };
    case 'CLEAR_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload
            ? {
                ...p,
                graphs: [{ id: 'main', name: 'Main Component', nodes: [], connections: [] }],
                activeGraphId: 'main',
                entities: [],
                modified: false,
              }
            : p
        ),
        selectedNodeId: null,
        selectedConnectionId: null,
      };
    case 'LOAD_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.projectId
            ? {
                ...p,
                graphs: action.payload.graphs,
                activeGraphId: action.payload.graphs[0]?.id || 'main',
                entities: action.payload.entities,
                modified: true,
              }
            : p
        ),
        selectedNodeId: null,
        selectedConnectionId: null,
      };
    case 'INSTALL_PLUGIN':
      return updateActiveProject(state, project => ({
        ...project,
        installedPlugins: [...project.installedPlugins, action.payload],
      }));
    case 'UNINSTALL_PLUGIN':
      return updateActiveProject(state, project => ({
        ...project,
        installedPlugins: project.installedPlugins.filter(p => p.id !== action.payload),
      }));
    default:
      return state;
  }
}

interface GraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<Action>;
  activeProject: Project | undefined;
  activeGraph: Graph | undefined;
  selectedNode: GraphNode | undefined;
  entities: Entity[];
  addNode: (type: string, x: number, y: number) => void;
  deleteSelectedNode: () => void;
  duplicateNode: (node: GraphNode) => void;
  createNewProject: (name?: string) => string;
  clearCurrentProject: () => void;
}

const GraphContext = createContext<GraphContextType | null>(null);

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const activeGraph = activeProject?.graphs.find(g => g.id === activeProject.activeGraphId);
  const selectedNode = activeGraph?.nodes.find(n => n.id === state.selectedNodeId);
  const entities = activeProject?.entities || [];

  const addNode = useCallback((type: string, x: number, y: number) => {
    if (!activeProject) return;

    const def = getNodeDefinition(type);
    if (!def) return;

    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const inputs: Port[] = def.inputs.map((input, i) => ({
      ...input,
      id: `${nodeId}_in_${i}`,
      connected: false,
    }));

    const outputs: Port[] = def.outputs.map((output, i) => ({
      ...output,
      id: `${nodeId}_out_${i}`,
      connected: false,
    }));

    const properties: Record<string, any> = {};
    def.properties?.forEach(prop => {
      properties[prop.name] = prop.default;
    });

    const node: GraphNode = {
      id: nodeId,
      type,
      x,
      y,
      inputs,
      outputs,
      properties,
    };

    dispatch({ type: 'ADD_NODE', payload: { graphId: activeProject.activeGraphId, node } });
  }, [activeProject]);

  const deleteSelectedNode = useCallback(() => {
    if (state.selectedNodeId && activeProject) {
      dispatch({
        type: 'DELETE_NODE',
        payload: { graphId: activeProject.activeGraphId, nodeId: state.selectedNodeId },
      });
    }
  }, [state.selectedNodeId, activeProject]);

  const duplicateNode = useCallback((node: GraphNode) => {
    if (!activeProject) return;

    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: GraphNode = {
      ...node,
      id: newNodeId,
      x: node.x + 50,
      y: node.y + 50,
      inputs: node.inputs.map((p, i) => ({ ...p, id: `${newNodeId}_in_${i}`, connected: false })),
      outputs: node.outputs.map((p, i) => ({ ...p, id: `${newNodeId}_out_${i}`, connected: false })),
    };

    dispatch({ type: 'ADD_NODE', payload: { graphId: activeProject.activeGraphId, node: newNode } });
  }, [activeProject]);

  const createNewProject = useCallback((name?: string): string => {
    const projectId = `project_${Date.now()}`;
    const projectName = name || `Projet ${state.projects.length + 1}`;
    const newProject = createDefaultProject(projectId, projectName);
    dispatch({ type: 'ADD_PROJECT', payload: newProject });
    return projectId;
  }, [state.projects.length]);

  const clearCurrentProject = useCallback(() => {
    if (activeProject) {
      dispatch({ type: 'CLEAR_PROJECT', payload: activeProject.id });
    }
  }, [activeProject]);

  return (
    <GraphContext.Provider
      value={{
        state,
        dispatch,
        activeProject,
        activeGraph,
        selectedNode,
        entities,
        addNode,
        deleteSelectedNode,
        duplicateNode,
        createNewProject,
        clearCurrentProject,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
};

export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
