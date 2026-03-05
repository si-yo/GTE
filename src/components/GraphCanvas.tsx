import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGraph } from '../store/GraphStore';
import { GraphNode as GraphNodeType, getNodeDefinition, Connection, Port } from '../types/nodes';
import { NodeGroup } from '../types/graph';

// Port colors by data type
const portColors: Record<string, string> = {
  flow: '#EF4444',
  string: '#EC4899',
  number: '#6366F1',
  boolean: '#10B981',
  any: '#64748B',
  array: '#F59E0B',
  object: '#14B8A6',
  ref: '#8B5CF6',
  state: '#8B5CF6',
  effect: '#F59E0B',
};

interface Position {
  x: number;
  y: number;
}

interface PortPosition {
  nodeId: string;
  portId: string;
  isOutput: boolean;
  x: number;
  y: number;
  dataType: string;
}

const NODE_WIDTH = 220;
const HEADER_HEIGHT = 36;
const PORT_HEIGHT = 28;
const PROPERTIES_HEIGHT = 28;
const PORT_VERTICAL_PADDING = 12;

const GraphNode: React.FC<{
  node: GraphNodeType;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onPortMouseDown: (portId: string, isOutput: boolean, e: React.MouseEvent) => void;
  onPortMouseUp: (portId: string, isOutput: boolean) => void;
  connectingFrom: { nodeId: string; portId: string; isOutput: boolean } | null;
  connections: Connection[];
  registerPortPosition: (pos: PortPosition) => void;
}> = ({ node, selected, onSelect, onDragStart, onPortMouseDown, onPortMouseUp, connectingFrom, connections, registerPortPosition }) => {
  const def = getNodeDefinition(node.type);
  const nodeRef = useRef<HTMLDivElement>(null);
  const portsRef = useRef<HTMLDivElement>(null);

  if (!def) return null;

  const hasProperties = node.properties && Object.keys(node.properties).length > 0;
  const displayProperties = hasProperties ? Object.entries(node.properties).slice(0, 2) : [];

  const isPortConnected = (portId: string) => {
    return connections.some(c => c.fromPort === portId || c.toPort === portId);
  };

  const canConnect = (_port: Port, isOutput: boolean) => {
    if (!connectingFrom) return false;
    if (connectingFrom.nodeId === node.id) return false;
    if (connectingFrom.isOutput === isOutput) return false;
    return true;
  };

  // Calculate total height based on ports
  const maxPorts = Math.max(node.inputs.length, node.outputs.length);
  const portsHeight = maxPorts * PORT_HEIGHT + PORT_VERTICAL_PADDING * 2;
  const propertiesHeight = displayProperties.length > 0 ? PROPERTIES_HEIGHT : 0;
  const contentHeight = propertiesHeight + portsHeight;

  // Calculate port Y positions relative to node
  const getPortY = (index: number) => {
    return HEADER_HEIGHT + propertiesHeight + PORT_VERTICAL_PADDING + index * PORT_HEIGHT + PORT_HEIGHT / 2;
  };

  // Register port positions on mount and update
  useEffect(() => {
    node.inputs.forEach((port, i) => {
      registerPortPosition({
        nodeId: node.id,
        portId: port.id,
        isOutput: false,
        x: node.x,
        y: node.y + getPortY(i),
        dataType: port.dataType,
      });
    });
    node.outputs.forEach((port, i) => {
      registerPortPosition({
        nodeId: node.id,
        portId: port.id,
        isOutput: true,
        x: node.x + NODE_WIDTH,
        y: node.y + getPortY(i),
        dataType: port.dataType,
      });
    });
  }, [node.x, node.y, node.inputs, node.outputs, registerPortPosition, node.id]);

  return (
    <div
      ref={nodeRef}
      className={`absolute select-none rounded-lg shadow-xl border-2 transition-shadow ${
        selected ? 'shadow-2xl ring-2 ring-blue-400 z-10' : ''
      }`}
      style={{
        left: node.x,
        top: node.y,
        borderColor: def.color,
        width: NODE_WIDTH,
        backgroundColor: '#1E293B',
        minHeight: HEADER_HEIGHT + contentHeight,
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.port-handle')) return;
        e.stopPropagation();
        onSelect();
        onDragStart(e);
      }}
    >
      {/* Header */}
      <div
        className="px-3 rounded-t-md flex items-center gap-2 cursor-move"
        style={{ backgroundColor: def.color, height: HEADER_HEIGHT }}
      >
        <span className="text-base">{def.icon}</span>
        <span className="text-white font-semibold text-sm truncate flex-1">{def.label}</span>
        {selected && <span className="text-white/60 text-xs">✓</span>}
      </div>

      {/* Content */}
      <div className="relative" style={{ minHeight: contentHeight }}>
        {/* Properties preview */}
        {displayProperties.length > 0 && (
          <div 
            className="mx-2 mt-2 px-2 py-1 bg-slate-800/80 rounded text-xs text-slate-400 overflow-hidden"
            style={{ height: PROPERTIES_HEIGHT - 8 }}
          >
            {displayProperties.map(([key, value]) => (
              <div key={key} className="truncate leading-tight">
                <span className="text-slate-500">{key}:</span>{' '}
                <span className="text-slate-300">{String(value).substring(0, 20)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ports Container */}
        <div 
          ref={portsRef}
          className="flex justify-between px-1"
          style={{ paddingTop: PORT_VERTICAL_PADDING, paddingBottom: PORT_VERTICAL_PADDING }}
        >
          {/* Inputs */}
          <div className="flex flex-col">
            {node.inputs.map((port) => (
              <div
                key={port.id}
                className="flex items-center relative"
                style={{ height: PORT_HEIGHT }}
              >
                {/* Port handle */}
                <div
                  className={`port-handle absolute w-5 h-5 rounded-full border-2 cursor-crosshair transition-all z-20 ${
                    canConnect(port, false) ? 'animate-pulse scale-110' : 'hover:scale-125'
                  } ${isPortConnected(port.id) ? 'scale-100' : ''}`}
                  style={{
                    left: -12,
                    backgroundColor: isPortConnected(port.id) ? portColors[port.dataType] : '#1E293B',
                    borderColor: portColors[port.dataType],
                    boxShadow: canConnect(port, false) 
                      ? `0 0 12px ${portColors[port.dataType]}, 0 0 4px ${portColors[port.dataType]}` 
                      : isPortConnected(port.id) 
                        ? `0 0 6px ${portColors[port.dataType]}40`
                        : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onPortMouseDown(port.id, false, e);
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    onPortMouseUp(port.id, false);
                  }}
                />
                <span className="text-xs text-slate-400 ml-4 truncate max-w-[70px]">{port.name}</span>
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div className="flex flex-col items-end">
            {node.outputs.map((port) => (
              <div
                key={port.id}
                className="flex items-center justify-end relative"
                style={{ height: PORT_HEIGHT }}
              >
                <span className="text-xs text-slate-400 mr-4 truncate max-w-[70px]">{port.name}</span>
                {/* Port handle */}
                <div
                  className={`port-handle absolute w-5 h-5 rounded-full border-2 cursor-crosshair transition-all z-20 ${
                    canConnect(port, true) ? 'animate-pulse scale-110' : 'hover:scale-125'
                  } ${connectingFrom?.portId === port.id ? 'scale-110 ring-2 ring-white' : ''}`}
                  style={{
                    right: -12,
                    backgroundColor: isPortConnected(port.id) || connectingFrom?.portId === port.id 
                      ? portColors[port.dataType] 
                      : '#1E293B',
                    borderColor: portColors[port.dataType],
                    boxShadow: canConnect(port, true) 
                      ? `0 0 12px ${portColors[port.dataType]}, 0 0 4px ${portColors[port.dataType]}` 
                      : isPortConnected(port.id)
                        ? `0 0 6px ${portColors[port.dataType]}40`
                        : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onPortMouseDown(port.id, true, e);
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    onPortMouseUp(port.id, true);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionLine: React.FC<{
  connection: Connection;
  portPositions: Map<string, PortPosition>;
  selected: boolean;
  onSelect: () => void;
  showLabel?: boolean;
}> = ({ connection, portPositions, selected, onSelect, showLabel = true }) => {
  const fromPos = portPositions.get(connection.fromPort);
  const toPos = portPositions.get(connection.toPort);

  if (!fromPos || !toPos) return null;

  const fromX = fromPos.x;
  const fromY = fromPos.y;
  const toX = toPos.x;
  const toY = toPos.y;

  // Bezier curve control points
  const dx = Math.max(Math.abs(toX - fromX) * 0.5, 50);
  const path = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

  // Calculate midpoint for label
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  const color = portColors[fromPos.dataType] || '#64748B';
  const isFlow = fromPos.dataType === 'flow';

  // Get display label for data type
  const getDataTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      flow: '▶',
      string: 'Aa',
      number: '#',
      boolean: '⚡',
      any: '◈',
      array: '[]',
      object: '{}',
      ref: '⊙',
      state: '◉',
      effect: '⟳',
    };
    return labels[type] || type;
  };

  return (
    <g onClick={(e) => { e.stopPropagation(); onSelect(); }} className="cursor-pointer group">
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      {/* Glow effect when selected */}
      {selected && (
        <path
          d={path}
          fill="none"
          stroke="#60A5FA"
          strokeWidth={8}
          strokeLinecap="round"
          className="pointer-events-none"
          opacity={0.3}
        />
      )}
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={selected ? '#60A5FA' : color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
        className="transition-all pointer-events-none"
        style={{
          filter: selected ? 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.8))' : undefined,
        }}
      />
      {/* Animated flow indicator for flow type */}
      {isFlow && (
        <>
          <circle r={4} fill={color} className="pointer-events-none">
            <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r={4} fill={color} className="pointer-events-none" opacity={0.5}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={path} begin="0.5s" />
          </circle>
        </>
      )}
      {/* Arrow head */}
      <polygon
        points={`${toX - 8},${toY - 4} ${toX},${toY} ${toX - 8},${toY + 4}`}
        fill={selected ? '#60A5FA' : color}
        className="pointer-events-none"
      />
      {/* Data type label - shown on hover or when selected */}
      {showLabel && (
        <g className={`pointer-events-none transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <rect
            x={midX - 14}
            y={midY - 10}
            width={28}
            height={20}
            rx={4}
            fill={color}
            opacity={0.9}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontWeight="bold"
            className="select-none"
          >
            {getDataTypeLabel(fromPos.dataType)}
          </text>
        </g>
      )}
    </g>
  );
};

const TempConnectionLine: React.FC<{
  fromPos: PortPosition;
  mousePos: Position;
  isFromOutput: boolean;
}> = ({ fromPos, mousePos, isFromOutput }) => {
  const startX = isFromOutput ? fromPos.x : mousePos.x;
  const startY = isFromOutput ? fromPos.y : mousePos.y;
  const endX = isFromOutput ? mousePos.x : fromPos.x;
  const endY = isFromOutput ? mousePos.y : fromPos.y;

  const dx = Math.max(Math.abs(endX - startX) * 0.5, 30);
  const path = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

  const color = portColors[fromPos.dataType] || '#64748B';

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray="8,4"
      opacity={0.8}
      className="pointer-events-none"
    />
  );
};

// Context menu for node actions
interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  isMultiSelect?: boolean;
}

export const GraphCanvas: React.FC = () => {
  const { state, dispatch, activeGraph, addNode } = useGraph();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portId: string; isOutput: boolean } | null>(null);
  const [portPositions, setPortPositions] = useState<Map<string, PortPosition>>(new Map());
  
  // Multi-selection and factorization states
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Position>({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState<Position>({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [groups, setGroups] = useState<NodeGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const registerPortPosition = useCallback((pos: PortPosition) => {
    setPortPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(pos.portId, pos);
      return newMap;
    });
  }, []);

  const getCanvasCoords = useCallback((clientX: number, clientY: number): Position => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - state.panX) / state.zoom,
      y: (clientY - rect.top - state.panY) / state.zoom,
    };
  }, [state.panX, state.panY, state.zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (draggingNode && activeGraph) {
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;
      dispatch({
        type: 'UPDATE_NODE',
        payload: {
          graphId: activeGraph.id,
          nodeId: draggingNode,
          updates: { x: Math.round(newX / 10) * 10, y: Math.round(newY / 10) * 10 },
        },
      });
    }

    if (isPanning) {
      dispatch({
        type: 'SET_PAN',
        payload: {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        },
      });
    }
  }, [draggingNode, dragOffset, isPanning, panStart, getCanvasCoords, activeGraph, dispatch]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
    // Cancel connection if mouse released on canvas
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Close context menu on any click
    setContextMenu(null);
    
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - state.panX, y: e.clientY - state.panY });
    } else if (e.button === 0 && e.shiftKey) {
      // Start selection box
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setIsSelecting(true);
      setSelectionStart(coords);
      setSelectionEnd(coords);
    } else if (e.button === 0) {
      dispatch({ type: 'SELECT_NODE', payload: null });
      setSelectedNodeIds(new Set());
      setConnectingFrom(null);
    }
  }, [state.panX, state.panY, dispatch, getCanvasCoords]);
  
  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId?: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      isMultiSelect: selectedNodeIds.size > 1,
    });
  }, [selectedNodeIds]);
  
  // Create a group from selected nodes
  const createGroup = useCallback((name: string) => {
    if (selectedNodeIds.size < 2) return;
    
    const nodeIds = Array.from(selectedNodeIds);
    const newGroup: NodeGroup = {
      id: `group_${Date.now()}`,
      name,
      nodeIds,
      collapsed: false,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    };
    
    setGroups(prev => [...prev, newGroup]);
    setSelectedNodeIds(new Set());
    setContextMenu(null);
  }, [selectedNodeIds]);
  
  // Toggle group collapse
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);
  
  // Get group for a node
  const getNodeGroup = useCallback((nodeId: string) => {
    return groups.find(g => g.nodeIds.includes(nodeId));
  }, [groups]);
  
  // Check if node should be visible (not in collapsed group)
  const isNodeVisible = useCallback((nodeId: string) => {
    const group = getNodeGroup(nodeId);
    if (!group) return true;
    // If group is collapsed, only show the first node (as representative)
    if (collapsedGroups.has(group.id)) {
      return group.nodeIds[0] === nodeId;
    }
    return true;
  }, [getNodeGroup, collapsedGroups]);

  // Use native event listener for wheel to set passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: 'SET_ZOOM', payload: state.zoom + delta });
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvas.removeEventListener('wheel', wheelHandler);
  }, [state.zoom, dispatch]);

  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (!activeGraph) return;

    const node = activeGraph.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    setDraggingNode(nodeId);
    setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
  }, [activeGraph, getCanvasCoords]);

  const handlePortMouseDown = useCallback((nodeId: string, portId: string, isOutput: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConnectingFrom({ nodeId, portId, isOutput });
  }, []);

  const handlePortMouseUp = useCallback((nodeId: string, portId: string, isOutput: boolean) => {
    if (!activeGraph || !connectingFrom) return;
    
    // Can't connect to same node
    if (connectingFrom.nodeId === nodeId) {
      setConnectingFrom(null);
      return;
    }
    
    // Can't connect output to output or input to input
    if (connectingFrom.isOutput === isOutput) {
      setConnectingFrom(null);
      return;
    }

    // Determine from and to based on which is output/input
    const fromNode = connectingFrom.isOutput ? connectingFrom.nodeId : nodeId;
    const fromPort = connectingFrom.isOutput ? connectingFrom.portId : portId;
    const toNode = connectingFrom.isOutput ? nodeId : connectingFrom.nodeId;
    const toPort = connectingFrom.isOutput ? portId : connectingFrom.portId;

    const connection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromNode,
      fromPort,
      toNode,
      toPort,
    };

    dispatch({ type: 'ADD_CONNECTION', payload: { graphId: activeGraph.id, connection } });
    setConnectingFrom(null);
  }, [activeGraph, connectingFrom, dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    if (!nodeType) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    addNode(nodeType, Math.round(coords.x / 10) * 10, Math.round(coords.y / 10) * 10);
  }, [getCanvasCoords, addNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent deleting if we're typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedNodeId && activeGraph) {
          dispatch({
            type: 'DELETE_NODE',
            payload: { graphId: activeGraph.id, nodeId: state.selectedNodeId },
          });
        }
        if (state.selectedConnectionId && activeGraph) {
          dispatch({
            type: 'DELETE_CONNECTION',
            payload: { graphId: activeGraph.id, connectionId: state.selectedConnectionId },
          });
        }
      }
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        dispatch({ type: 'SELECT_NODE', payload: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, state.selectedConnectionId, activeGraph, dispatch]);

  const connectingFromPos = connectingFrom ? portPositions.get(connectingFrom.portId) : null;

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-slate-950"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default' }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(71, 85, 105, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71, 85, 105, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * state.zoom}px ${20 * state.zoom}px`,
          backgroundPosition: `${state.panX}px ${state.panY}px`,
        }}
      />

      {/* Info bar */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <div className="bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-full text-sm text-slate-400 flex items-center gap-2">
          <span>Zoom: {Math.round(state.zoom * 100)}%</span>
        </div>
        {connectingFrom && (
          <div className="bg-blue-600/90 backdrop-blur px-3 py-1.5 rounded-full text-sm text-white animate-pulse">
            🔗 Connexion en cours... (Échap pour annuler)
          </div>
        )}
      </div>

      {/* Connections SVG */}
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        style={{
          transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <g className="pointer-events-auto">
          {activeGraph?.connections.map((conn) => (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              portPositions={portPositions}
              selected={state.selectedConnectionId === conn.id}
              onSelect={() => dispatch({ type: 'SELECT_CONNECTION', payload: conn.id })}
            />
          ))}
          {connectingFrom && connectingFromPos && (
            <TempConnectionLine
              fromPos={connectingFromPos}
              mousePos={mousePos}
              isFromOutput={connectingFrom.isOutput}
            />
          )}
        </g>
      </svg>

      {/* Group backgrounds */}
      <div
        className="absolute inset-0 overflow-visible pointer-events-none"
        style={{
          transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {groups.map(group => {
          const groupNodes = activeGraph?.nodes.filter(n => group.nodeIds.includes(n.id)) || [];
          if (groupNodes.length === 0) return null;
          
          const isCollapsed = collapsedGroups.has(group.id);
          const minX = Math.min(...groupNodes.map(n => n.x)) - 20;
          const minY = Math.min(...groupNodes.map(n => n.y)) - 40;
          const maxX = Math.max(...groupNodes.map(n => n.x + NODE_WIDTH)) + 20;
          const maxY = Math.max(...groupNodes.map(n => n.y + 150)) + 20;
          
          return (
            <div
              key={group.id}
              className="absolute rounded-xl border-2 border-dashed pointer-events-auto cursor-pointer transition-all"
              style={{
                left: minX,
                top: minY,
                width: isCollapsed ? 200 : maxX - minX,
                height: isCollapsed ? 60 : maxY - minY,
                backgroundColor: `${group.color}15`,
                borderColor: group.color,
              }}
              onClick={() => toggleGroupCollapse(group.id)}
              onContextMenu={(e) => handleContextMenu(e)}
            >
              <div 
                className="absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-2"
                style={{ backgroundColor: group.color }}
              >
                <span>{isCollapsed ? '▶' : '▼'}</span>
                <span>{group.name}</span>
                <span className="opacity-70">({group.nodeIds.length} nœuds)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection box */}
      {isSelecting && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
          style={{
            left: state.panX + Math.min(selectionStart.x, selectionEnd.x) * state.zoom,
            top: state.panY + Math.min(selectionStart.y, selectionEnd.y) * state.zoom,
            width: Math.abs(selectionEnd.x - selectionStart.x) * state.zoom,
            height: Math.abs(selectionEnd.y - selectionStart.y) * state.zoom,
          }}
        />
      )}

      {/* Nodes container */}
      <div
        className="absolute inset-0 overflow-visible"
        style={{
          transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {activeGraph?.nodes.filter(node => isNodeVisible(node.id)).map((node) => {
          const nodeGroup = getNodeGroup(node.id);
          const isGrouped = !!nodeGroup;
          const isCollapsedRep = nodeGroup && collapsedGroups.has(nodeGroup.id);
          const isMultiSelected = selectedNodeIds.has(node.id);
          
          return (
            <div key={node.id} className="relative">
              {/* Source file indicator */}
              {(node as any).sourceInfo && (
                <div 
                  className="absolute -top-5 left-0 text-xs text-slate-500 truncate max-w-[200px]"
                  title={(node as any).sourceInfo.filePath}
                >
                  📁 {(node as any).sourceInfo.fileName}:{(node as any).sourceInfo.lineStart}
                </div>
              )}
              
              {/* Collapsed group indicator */}
              {isCollapsedRep && (
                <div 
                  className="absolute -top-5 right-0 text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: nodeGroup?.color, color: 'white' }}
                >
                  📦 {nodeGroup?.nodeIds.length} nœuds
                </div>
              )}
              
              <GraphNode
                node={node}
                selected={state.selectedNodeId === node.id || isMultiSelected}
                onSelect={() => {
                  if (window.event && (window.event as KeyboardEvent).ctrlKey) {
                    // Add to multi-selection
                    setSelectedNodeIds(prev => {
                      const next = new Set(prev);
                      if (next.has(node.id)) {
                        next.delete(node.id);
                      } else {
                        next.add(node.id);
                      }
                      return next;
                    });
                  } else {
                    dispatch({ type: 'SELECT_NODE', payload: node.id });
                    setSelectedNodeIds(new Set([node.id]));
                  }
                }}
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
                onPortMouseDown={(portId, isOutput, e) => handlePortMouseDown(node.id, portId, isOutput, e)}
                onPortMouseUp={(portId, isOutput) => handlePortMouseUp(node.id, portId, isOutput)}
                connectingFrom={connectingFrom}
                connections={activeGraph.connections}
                registerPortPosition={registerPortPosition}
              />
              
              {/* Group badge */}
              {isGrouped && !isCollapsedRep && (
                <div 
                  className="absolute -bottom-2 right-2 w-3 h-3 rounded-full border-2 border-slate-900"
                  style={{ backgroundColor: nodeGroup?.color }}
                  title={`Groupe: ${nodeGroup?.name}`}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {selectedNodeIds.size >= 2 && (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                onClick={() => {
                  const name = prompt('Nom du groupe:', 'Nouveau groupe');
                  if (name) createGroup(name);
                }}
              >
                📦 Créer un groupe ({selectedNodeIds.size} nœuds)
              </button>
              <div className="h-px bg-slate-700 my-1" />
            </>
          )}
          {contextMenu.nodeId && (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                onClick={() => {
                  const nodeGroup = getNodeGroup(contextMenu.nodeId!);
                  if (nodeGroup) {
                    setGroups(prev => prev.filter(g => g.id !== nodeGroup.id));
                  }
                  setContextMenu(null);
                }}
                disabled={!getNodeGroup(contextMenu.nodeId)}
              >
                📤 Retirer du groupe
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                onClick={() => {
                  if (activeGraph && contextMenu.nodeId) {
                    dispatch({
                      type: 'DELETE_NODE',
                      payload: { graphId: activeGraph.id, nodeId: contextMenu.nodeId },
                    });
                  }
                  setContextMenu(null);
                }}
              >
                🗑️ Supprimer le nœud
              </button>
            </>
          )}
          <button
            className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700"
            onClick={() => setContextMenu(null)}
          >
            ✕ Fermer
          </button>
        </div>
      )}

      {/* Empty state */}
      {activeGraph?.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-500 bg-slate-900/50 p-8 rounded-2xl">
            <p className="text-2xl mb-2">📊 Glissez des nœuds ici</p>
            <p className="text-sm">depuis le panneau de gauche</p>
            <div className="mt-4 text-xs text-slate-600">
              <p>Alt + Drag pour déplacer le canvas</p>
              <p>Scroll pour zoomer</p>
            </div>
          </div>
        </div>
      )}

      {/* Data types legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-slate-800/90 backdrop-blur rounded-lg p-3 text-xs">
          <p className="text-slate-400 font-medium mb-2">Types de données:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { type: 'flow', label: 'Exécution' },
              { type: 'string', label: 'Texte' },
              { type: 'number', label: 'Nombre' },
              { type: 'boolean', label: 'Booléen' },
              { type: 'array', label: 'Liste' },
              { type: 'object', label: 'Objet' },
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: portColors[type] }}
                />
                <span className="text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
