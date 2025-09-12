import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface Room {
  id: string;
  points: Point[];
  label: string;
  area: number;
  color: string;
  selected?: boolean;
}

interface RoomCanvasProps {
  tool: 'select' | 'room' | 'label' | 'erase';
  onRoomsChange?: (rooms: Room[]) => void;
  onCoordinateChange?: (point: Point | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedColor: string;
}

const GRID_SIZE = 20;
const RULER_HEIGHT = 40;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;

// Predefined room colors
const ROOM_COLORS = [
  '#FF6B6B40', '#4ECDC440', '#45B7D140', '#96CEB440', 
  '#FFEAA740', '#DDA0DD40', '#98D8C840', '#F7DC6F40'
];

export const RoomCanvas: React.FC<RoomCanvasProps> = ({
  tool,
  onRoomsChange,
  onCoordinateChange,
  zoom,
  onZoomChange,
  selectedColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [viewOffset, setViewOffset] = useState({ x: 200, y: 200 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Convert screen coordinates to grid coordinates
  const screenToGrid = useCallback((point: Point): Point => {
    const scaledGridSize = GRID_SIZE * (zoom / 100);
    return {
      x: Math.round((point.x - viewOffset.x) / scaledGridSize),
      y: Math.round((point.y - viewOffset.y) / scaledGridSize)
    };
  }, [zoom, viewOffset]);

  // Convert grid coordinates to screen coordinates
  const gridToScreen = useCallback((point: Point): Point => {
    const scaledGridSize = GRID_SIZE * (zoom / 100);
    return {
      x: point.x * scaledGridSize + viewOffset.x,
      y: point.y * scaledGridSize + viewOffset.y
    };
  }, [zoom, viewOffset]);

  // Calculate polygon area using shoelace formula
  const calculateArea = useCallback((points: Point[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }, []);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  // Draw main grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize;
    const scaledGridSize = GRID_SIZE * (zoom / 100);
    
    // Use direct color values instead of CSS variables for better compatibility
    const gridLineColor = '#e5e5e5';
    const gridMajorColor = '#d1d5db';
    
    // Calculate visible grid bounds
    const startX = Math.floor(-viewOffset.x / scaledGridSize) * scaledGridSize;
    const startY = Math.floor(-viewOffset.y / scaledGridSize) * scaledGridSize;
    const endX = Math.ceil((width - viewOffset.x) / scaledGridSize) * scaledGridSize;
    const endY = Math.ceil((height - viewOffset.y) / scaledGridSize) * scaledGridSize;
    
    // Minor grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;

    for (let x = startX; x <= endX; x += scaledGridSize) {
      const screenX = x + viewOffset.x;
      if (screenX >= 0 && screenX <= width) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
    }

    for (let y = startY; y <= endY; y += scaledGridSize) {
      const screenY = y + viewOffset.y;
      if (screenY >= 0 && screenY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }

    // Major grid lines (every 5 units)
    ctx.strokeStyle = gridMajorColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    const majorGridSize = scaledGridSize * 5;

    for (let x = Math.floor(startX / majorGridSize) * majorGridSize; x <= endX; x += majorGridSize) {
      const screenX = x + viewOffset.x;
      if (screenX >= 0 && screenX <= width) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
    }

    for (let y = Math.floor(startY / majorGridSize) * majorGridSize; y <= endY; y += majorGridSize) {
      const screenY = y + viewOffset.y;
      if (screenY >= 0 && screenY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }, [canvasSize, zoom, viewOffset]);

  // Draw rooms
  const drawRooms = useCallback((ctx: CanvasRenderingContext2D) => {
    rooms.forEach(room => {
      if (room.points.length < 3) return;

      const screenPoints = room.points.map(point => gridToScreen(point));
      
      // Fill room area
      ctx.fillStyle = room.selected ? `${room.color}80` : room.color;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      screenPoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();

      // Draw room outline
      ctx.strokeStyle = room.selected ? '#000000' : '#00000060';
      ctx.lineWidth = room.selected ? 3 : 2;
      ctx.stroke();

      // Draw vertices
      ctx.fillStyle = room.selected ? '#000000' : '#00000080';
      screenPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw room label and area
      if (screenPoints.length > 0) {
        const centerX = screenPoints.reduce((sum, p) => sum + p.x, 0) / screenPoints.length;
        const centerY = screenPoints.reduce((sum, p) => sum + p.y, 0) / screenPoints.length;
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(room.label, centerX, centerY - 8);
        
        ctx.font = '12px system-ui';
        ctx.fillText(`${room.area.toFixed(0)} sq ft`, centerX, centerY + 8);
      }
    });
  }, [rooms, gridToScreen]);

  // Draw current room being created
  const drawCurrentRoom = useCallback((ctx: CanvasRenderingContext2D) => {
    if (currentRoom.length === 0 || tool !== 'room') return;

    const screenPoints = currentRoom.map(point => gridToScreen(point));
    
    // Add current mouse position if available
    if (mousePos) {
      const gridPos = screenToGrid(mousePos);
      const screenPos = gridToScreen(gridPos);
      screenPoints.push(screenPos);
    }

    if (screenPoints.length < 2) return;

    // Draw preview polygon
    ctx.strokeStyle = selectedColor.replace('40', '80');
    ctx.fillStyle = selectedColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    screenPoints.slice(1).forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    if (screenPoints.length > 2) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw vertices
    ctx.fillStyle = '#000000';
    currentRoom.forEach(point => {
      const screenPoint = gridToScreen(point);
      ctx.beginPath();
      ctx.arc(screenPoint.x, screenPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [currentRoom, mousePos, tool, selectedColor, gridToScreen, screenToGrid]);

  // Draw rulers with foot measurements
  const drawRulers = useCallback(() => {
    const topCanvas = rulerTopRef.current;
    const leftCanvas = rulerLeftRef.current;
    if (!topCanvas || !leftCanvas) return;

    const topCtx = topCanvas.getContext('2d');
    const leftCtx = leftCanvas.getContext('2d');
    if (!topCtx || !leftCtx) return;

    const scaledGridSize = GRID_SIZE * (zoom / 100);
    
    // Use direct colors for better compatibility
    const rulerBg = '#f8f9fa';
    const rulerText = '#6c757d';
    const rulerMajorText = '#212529';
    const rulerLine = '#adb5bd';

    // Clear rulers
    topCtx.fillStyle = rulerBg;
    topCtx.fillRect(0, 0, topCanvas.width, topCanvas.height);
    leftCtx.fillStyle = rulerBg;
    leftCtx.fillRect(0, 0, leftCanvas.width, leftCanvas.height);

    // Top ruler (X-axis) - Convert grid units to feet (1 grid unit = 1 foot)
    topCtx.strokeStyle = rulerLine;
    topCtx.lineWidth = 1;
    topCtx.textAlign = 'center';

    const startGridX = Math.floor(-viewOffset.x / scaledGridSize);
    const endGridX = Math.ceil((canvasSize.width - viewOffset.x) / scaledGridSize);

    // Draw all tick marks first
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      const screenX = gridX * scaledGridSize + viewOffset.x;
      if (screenX >= 0 && screenX <= canvasSize.width) {
        const feet = gridX;
        const isMajor = feet % 5 === 0;
        const tickHeight = isMajor ? 12 : 6;
        
        topCtx.beginPath();
        topCtx.moveTo(screenX, RULER_HEIGHT - tickHeight);
        topCtx.lineTo(screenX, RULER_HEIGHT);
        topCtx.stroke();
      }
    }

    // Draw text labels for major ticks (every 5 feet)
    topCtx.font = 'bold 11px system-ui';
    topCtx.fillStyle = rulerMajorText;
    for (let gridX = startGridX; gridX <= endGridX; gridX += 5) {
      const screenX = gridX * scaledGridSize + viewOffset.x;
      if (screenX >= 0 && screenX <= canvasSize.width && gridX >= 0) {
        const feet = gridX;
        topCtx.fillText(`${feet}ft`, screenX, RULER_HEIGHT - 18);
      }
    }

    // Left ruler (Y-axis) - Convert grid units to feet
    leftCtx.strokeStyle = rulerLine;
    leftCtx.lineWidth = 1;
    leftCtx.textAlign = 'center';

    const startGridY = Math.floor(-viewOffset.y / scaledGridSize);
    const endGridY = Math.ceil((canvasSize.height - viewOffset.y) / scaledGridSize);

    // Draw all tick marks first
    for (let gridY = startGridY; gridY <= endGridY; gridY++) {
      const screenY = gridY * scaledGridSize + viewOffset.y;
      if (screenY >= 0 && screenY <= canvasSize.height) {
        const feet = gridY;
        const isMajor = feet % 5 === 0;
        const tickWidth = isMajor ? 12 : 6;
        
        leftCtx.beginPath();
        leftCtx.moveTo(RULER_HEIGHT - tickWidth, screenY);
        leftCtx.lineTo(RULER_HEIGHT, screenY);
        leftCtx.stroke();
      }
    }

    // Draw text labels for major ticks (every 5 feet)
    leftCtx.font = 'bold 11px system-ui';
    leftCtx.fillStyle = rulerMajorText;
    for (let gridY = startGridY; gridY <= endGridY; gridY += 5) {
      const screenY = gridY * scaledGridSize + viewOffset.y;
      if (screenY >= 0 && screenY <= canvasSize.height && gridY >= 0) {
        const feet = gridY;
        leftCtx.save();
        leftCtx.translate(RULER_HEIGHT - 18, screenY);
        leftCtx.rotate(-Math.PI / 2);
        leftCtx.fillText(`${feet}ft`, 0, 0);
        leftCtx.restore();
      }
    }
  }, [canvasSize, zoom, viewOffset]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    drawGrid(ctx);
    drawRooms(ctx);
    drawCurrentRoom(ctx);
    drawRulers();
    
    // Debug log
    console.log('Canvas rendered:', { canvasSize, zoom, viewOffset, tool });
  }, [canvasSize, drawGrid, drawRooms, drawCurrentRoom, drawRulers, zoom, viewOffset, tool]);

  // Handle touch/mouse events
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getMousePos(e);
    
    // Handle panning with two fingers or middle mouse
    if (('touches' in e && e.touches.length === 2) || ('button' in e && e.button === 1)) {
      setIsPanning(true);
      setLastPanPoint(pos);
      return;
    }

    const gridPos = screenToGrid(pos);

    if (tool === 'room') {
      // Check if clicking on first point to close room
      if (currentRoom.length >= 3) {
        const firstScreenPoint = gridToScreen(currentRoom[0]);
        const distance = Math.sqrt(
          Math.pow(pos.x - firstScreenPoint.x, 2) + 
          Math.pow(pos.y - firstScreenPoint.y, 2)
        );
        
        if (distance < 20) {
          // Close the room
          const area = calculateArea(currentRoom);
          const newRoom: Room = {
            id: Date.now().toString(),
            points: [...currentRoom],
            label: `Room ${rooms.length + 1}`,
            area: area,
            color: selectedColor,
          };
          const newRooms = [...rooms, newRoom];
          setRooms(newRooms);
          onRoomsChange?.(newRooms);
          setCurrentRoom([]);
          return;
        }
      }
      
      // Add point to current room
      setCurrentRoom(prev => [...prev, gridPos]);
    } else if (tool === 'select') {
      // Select room
      const clickedRoom = rooms.find(room => {
        if (room.points.length < 3) return false;
        
        // Point-in-polygon test
        let inside = false;
        for (let i = 0, j = room.points.length - 1; i < room.points.length; j = i++) {
          if (
            room.points[i].y > gridPos.y !== room.points[j].y > gridPos.y &&
            gridPos.x <
              ((room.points[j].x - room.points[i].x) * (gridPos.y - room.points[i].y)) /
                (room.points[j].y - room.points[i].y) +
                room.points[i].x
          ) {
            inside = !inside;
          }
        }
        return inside;
      });
      
      if (clickedRoom) {
        setSelectedRoom(clickedRoom.id);
        const updatedRooms = rooms.map(r => ({
          ...r,
          selected: r.id === clickedRoom.id
        }));
        setRooms(updatedRooms);
        onRoomsChange?.(updatedRooms);
      } else {
        setSelectedRoom(null);
        const updatedRooms = rooms.map(r => ({ ...r, selected: false }));
        setRooms(updatedRooms);
        onRoomsChange?.(updatedRooms);
      }
    } else if (tool === 'erase') {
      // Delete room
      const clickedRoom = rooms.find(room => {
        if (room.points.length < 3) return false;
        
        // Point-in-polygon test
        let inside = false;
        for (let i = 0, j = room.points.length - 1; i < room.points.length; j = i++) {
          if (
            room.points[i].y > gridPos.y !== room.points[j].y > gridPos.y &&
            gridPos.x <
              ((room.points[j].x - room.points[i].x) * (gridPos.y - room.points[i].y)) /
                (room.points[j].y - room.points[i].y) +
                room.points[i].x
          ) {
            inside = !inside;
          }
        }
        return inside;
      });
      
      if (clickedRoom) {
        const newRooms = rooms.filter(r => r.id !== clickedRoom.id);
        setRooms(newRooms);
        onRoomsChange?.(newRooms);
      }
    }
  }, [tool, currentRoom, rooms, getMousePos, screenToGrid, gridToScreen, calculateArea, selectedColor, onRoomsChange]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);
    
    // Handle panning
    if (isPanning && lastPanPoint) {
      const deltaX = pos.x - lastPanPoint.x;
      const deltaY = pos.y - lastPanPoint.y;
      setViewOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint(pos);
      return;
    }
    
    const gridPos = screenToGrid(pos);
    onCoordinateChange?.(gridPos);
  }, [getMousePos, isPanning, lastPanPoint, screenToGrid, onCoordinateChange]);

  const handleEnd = useCallback(() => {
    setIsPanning(false);
    setLastPanPoint(null);
  }, []);

  const handleLeave = useCallback(() => {
    setMousePos(null);
    setIsPanning(false);
    setLastPanPoint(null);
    onCoordinateChange?.(null);
  }, [onCoordinateChange]);

  // Update canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const newWidth = Math.max(rect.width - RULER_HEIGHT, 400);
        const newHeight = Math.max(rect.height - RULER_HEIGHT, 300);
        
        setCanvasSize({
          width: newWidth,
          height: newHeight
        });
        
        // Also update ruler canvas sizes
        const topCanvas = rulerTopRef.current;
        const leftCanvas = rulerLeftRef.current;
        if (topCanvas) {
          topCanvas.width = newWidth;
          topCanvas.height = RULER_HEIGHT;
        }
        if (leftCanvas) {
          leftCanvas.width = RULER_HEIGHT;
          leftCanvas.height = newHeight;
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Render when dependencies change
  useEffect(() => {
    console.log('Rendering triggered with canvasSize:', canvasSize);
    render();
  }, [render]);

  // Cancel current room on tool change
  useEffect(() => {
    if (tool !== 'room') {
      setCurrentRoom([]);
    }
  }, [tool]);

  return (
    <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: '#ffffff' }}>
      {/* Top Ruler */}
      <canvas
        ref={rulerTopRef}
        width={canvasSize.width}
        height={RULER_HEIGHT}
        className="absolute top-0 z-10"
        style={{ 
          left: RULER_HEIGHT,
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}
      />
      
      {/* Left Ruler */}
      <canvas
        ref={rulerLeftRef}
        width={RULER_HEIGHT}
        height={canvasSize.height}
        className="absolute top-0 left-0 z-10"
        style={{ 
          top: RULER_HEIGHT,
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #dee2e6'
        }}
      />
      
      {/* Corner */}
      <div 
        className="absolute top-0 left-0 z-20"
        style={{ 
          width: RULER_HEIGHT, 
          height: RULER_HEIGHT,
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #dee2e6',
          borderBottom: '1px solid #dee2e6'
        }}
      />
      
      {/* Main Canvas */}
      <div 
        className="absolute overflow-hidden"
        style={{ 
          top: RULER_HEIGHT, 
          left: RULER_HEIGHT, 
          width: canvasSize.width, 
          height: canvasSize.height 
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={cn(
            "cursor-crosshair touch-none",
            tool === 'erase' && "cursor-not-allowed",
            tool === 'select' && "cursor-pointer",
            isPanning && "cursor-grabbing"
          )}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleLeave}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
      
      {/* Instructions Overlay */}
      {tool === 'room' && currentRoom.length > 0 && (
        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg z-30">
          <p className="text-sm font-medium">
            {currentRoom.length >= 3 ? 'Tap first point to close room' : `${3 - currentRoom.length} more points needed`}
          </p>
        </div>
      )}
    </div>
  );
};