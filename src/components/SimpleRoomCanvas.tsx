import React, { useRef, useEffect, useState, useCallback } from 'react';

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

interface SimpleRoomCanvasProps {
  tool: 'select' | 'room' | 'label' | 'erase';
  onRoomsChange?: (rooms: Room[]) => void;
  onCoordinateChange?: (point: Point | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedColor: string;
}

export const SimpleRoomCanvas: React.FC<SimpleRoomCanvasProps> = ({
  tool,
  onRoomsChange,
  onCoordinateChange,
  zoom,
  selectedColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [viewOffset, setViewOffset] = useState({ x: 50, y: 50 });
  
  const GRID_SIZE = 20;
  const RULER_SIZE = 40;
  
  // Convert screen to grid coordinates
  const screenToGrid = useCallback((point: Point): Point => {
    const scale = GRID_SIZE * (zoom / 100);
    return {
      x: Math.round((point.x - viewOffset.x) / scale),
      y: Math.round((point.y - viewOffset.y) / scale)
    };
  }, [zoom, viewOffset]);
  
  // Convert grid to screen coordinates
  const gridToScreen = useCallback((point: Point): Point => {
    const scale = GRID_SIZE * (zoom / 100);
    return {
      x: point.x * scale + viewOffset.x,
      y: point.y * scale + viewOffset.y
    };
  }, [zoom, viewOffset]);
  
  // Calculate area
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
  
  // Draw everything
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    const scale = GRID_SIZE * (zoom / 100);
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = viewOffset.x % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = viewOffset.y % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw major grid lines (every 5 units)
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    const majorScale = scale * 5;
    
    for (let x = viewOffset.x % majorScale; x < width; x += majorScale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = viewOffset.y % majorScale; y < height; y += majorScale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw grid labels
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let i = 0; i < width / majorScale + 2; i++) {
      const x = (viewOffset.x % majorScale) + i * majorScale;
      const gridX = Math.floor((x - viewOffset.x) / scale) * 5;
      if (gridX >= 0 && x > 10 && x < width - 10) {
        ctx.fillText(`${gridX}ft`, x, 15);
      }
    }
    
    // Y-axis labels
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < height / majorScale + 2; i++) {
      const y = (viewOffset.y % majorScale) + i * majorScale;
      const gridY = Math.floor((y - viewOffset.y) / scale) * 5;
      if (gridY >= 0 && y > 20 && y < height - 10) {
        ctx.save();
        ctx.translate(15, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${gridY}ft`, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
    
    // Draw existing rooms
    rooms.forEach(room => {
      if (room.points.length < 3) return;
      
      const screenPoints = room.points.map(gridToScreen);
      
      // Fill room
      ctx.fillStyle = room.color;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      screenPoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      
      // Stroke room
      ctx.strokeStyle = room.selected ? '#000000' : '#666666';
      ctx.lineWidth = room.selected ? 3 : 2;
      ctx.stroke();
      
      // Draw room label
      const centerX = screenPoints.reduce((sum, p) => sum + p.x, 0) / screenPoints.length;
      const centerY = screenPoints.reduce((sum, p) => sum + p.y, 0) / screenPoints.length;
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(room.label, centerX, centerY - 5);
      ctx.font = '12px Arial';
      ctx.fillText(`${room.area.toFixed(0)} sq ft`, centerX, centerY + 15);
    });
    
    // Draw current room being created
    if (tool === 'room' && currentRoom.length > 0) {
      const screenPoints = currentRoom.map(gridToScreen);
      
      if (mousePos) {
        const gridPos = screenToGrid(mousePos);
        screenPoints.push(gridToScreen(gridPos));
      }
      
      if (screenPoints.length > 1) {
        ctx.strokeStyle = selectedColor.replace('40', '');
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
      }
      
      // Draw vertices
      currentRoom.forEach(point => {
        const screenPoint = gridToScreen(point);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(screenPoint.x, screenPoint.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    console.log('Drawing complete. Grid visible with measurements.');
  }, [rooms, currentRoom, mousePos, tool, selectedColor, zoom, viewOffset, gridToScreen, screenToGrid]);
  
  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const gridPos = screenToGrid(point);
    console.log('Mouse down at:', gridPos);
    
    if (tool === 'room') {
      // Check if clicking near first point to close room
      if (currentRoom.length >= 3) {
        const firstScreenPoint = gridToScreen(currentRoom[0]);
        const distance = Math.sqrt(
          Math.pow(point.x - firstScreenPoint.x, 2) + 
          Math.pow(point.y - firstScreenPoint.y, 2)
        );
        
        if (distance < 20) {
          // Close room
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
          console.log('Room created:', newRoom);
          return;
        }
      }
      
      // Add point
      setCurrentRoom(prev => [...prev, gridPos]);
      console.log('Point added:', gridPos);
    }
  }, [tool, currentRoom, rooms, screenToGrid, gridToScreen, calculateArea, selectedColor, onRoomsChange]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setMousePos(point);
    const gridPos = screenToGrid(point);
    onCoordinateChange?.(gridPos);
  }, [screenToGrid, onCoordinateChange]);
  
  // Setup canvas size
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      console.log('Canvas resized to:', rect.width, 'x', rect.height);
      draw();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);
  
  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);
  
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setMousePos(null);
          onCoordinateChange?.(null);
        }}
      />
      
      {/* Instructions */}
      {tool === 'room' && currentRoom.length > 0 && (
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
          <p className="text-sm font-medium">
            {currentRoom.length >= 3 ? 'Click first point to close room' : `${3 - currentRoom.length} more points needed`}
          </p>
        </div>
      )}
    </div>
  );
};