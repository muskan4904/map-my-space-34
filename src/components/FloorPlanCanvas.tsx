import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  selected?: boolean;
}

interface FloorPlanCanvasProps {
  tool: 'select' | 'wall' | 'erase';
  onWallsChange?: (walls: Wall[]) => void;
  onCoordinateChange?: (point: Point | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const GRID_SIZE = 20;
const GRID_MAJOR_INTERVAL = 5;
const MAX_GRID_SIZE = 500; // 500x500 grid
const MIN_ZOOM = 1;
const MAX_ZOOM = 100;

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  tool,
  onWallsChange,
  onCoordinateChange,
  zoom,
  onZoomChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWall, setCurrentWall] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Snap to grid
  const snapToGrid = useCallback((point: Point): Point => {
    const scaledGridSize = GRID_SIZE * (zoom / 10); // Normalize zoom scale
    return {
      x: Math.round(point.x / scaledGridSize) * scaledGridSize,
      y: Math.round(point.y / scaledGridSize) * scaledGridSize
    };
  }, [zoom]);

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

  // Convert canvas coordinates to grid coordinates
  const canvasToGrid = useCallback((point: Point): Point => {
    const scaledGridSize = GRID_SIZE * (zoom / 10);
    return {
      x: Math.round((point.x - viewOffset.x) / scaledGridSize),
      y: Math.round((point.y - viewOffset.y) / scaledGridSize)
    };
  }, [zoom, viewOffset]);

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize;
    const scaledGridSize = GRID_SIZE * (zoom / 10);
    
    // Get CSS custom properties and convert to actual color values
    const gridLineColor = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim()})`;
    const gridMajorColor = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--grid-major').trim()})`;
    
    // Calculate grid bounds based on view offset and zoom
    const startX = Math.floor(-viewOffset.x / scaledGridSize) * scaledGridSize;
    const startY = Math.floor(-viewOffset.y / scaledGridSize) * scaledGridSize;
    const endX = Math.ceil((width - viewOffset.x) / scaledGridSize) * scaledGridSize;
    const endY = Math.ceil((height - viewOffset.y) / scaledGridSize) * scaledGridSize;
    
    // Minor grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = Math.max(0.5, 1 * (zoom / 50));
    ctx.globalAlpha = Math.min(1, zoom / 20);

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

    // Major grid lines
    ctx.strokeStyle = gridMajorColor;
    ctx.lineWidth = Math.max(1, 2 * (zoom / 30));
    ctx.globalAlpha = Math.min(1, zoom / 15);
    const majorGridSize = scaledGridSize * GRID_MAJOR_INTERVAL;

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

    // Reset alpha
    ctx.globalAlpha = 1;
  }, [canvasSize, zoom, viewOffset]);

  // Draw walls
  const drawWalls = useCallback((ctx: CanvasRenderingContext2D) => {
    walls.forEach(wall => {
      const wallColor = wall.selected ? 
        `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--wall-selected').trim()})` :
        `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--wall').trim()})`;
      
      ctx.strokeStyle = wallColor;
      ctx.lineWidth = (wall.selected ? 4 : 3) * Math.max(0.5, zoom / 20);
      ctx.lineCap = 'round';
      ctx.shadowColor = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--canvas-shadow').trim()})`;
      ctx.shadowBlur = wall.selected ? 8 : 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Transform wall coordinates to screen coordinates
      const startX = wall.start.x * (zoom / 10) + viewOffset.x;
      const startY = wall.start.y * (zoom / 10) + viewOffset.y;
      const endX = wall.end.x * (zoom / 10) + viewOffset.x;
      const endY = wall.end.y * (zoom / 10) + viewOffset.y;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw endpoints
      ctx.fillStyle = wallColor;
      const pointRadius = Math.max(2, 4 * (zoom / 20));
      ctx.beginPath();
      ctx.arc(startX, startY, pointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, endY, pointRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [walls, zoom, viewOffset]);

  // Draw current wall being drawn (simplified - no internal measurements)
  const drawCurrentWall = useCallback((ctx: CanvasRenderingContext2D) => {
    if (currentWall && mousePos && tool === 'wall') {
      const snappedEnd = snapToGrid(mousePos);
      
      const measurementColor = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--measurement').trim()})`;
      
      ctx.strokeStyle = measurementColor;
      ctx.lineWidth = Math.max(1, 2 * (zoom / 20));
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.8;

      const startX = currentWall.x + viewOffset.x;
      const startY = currentWall.y + viewOffset.y;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(snappedEnd.x, snappedEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }, [currentWall, mousePos, tool, snapToGrid, zoom, viewOffset]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with proper color
    const canvasColor = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()})`;
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    drawGrid(ctx);
    drawWalls(ctx);
    drawCurrentWall(ctx);
  }, [canvasSize, drawGrid, drawWalls, drawCurrentWall]);

  // Handle mouse/touch events
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getMousePos(e);
    
    // Handle panning with middle mouse or touch
    if ('button' in e && e.button === 1) {
      setIsPanning(true);
      setLastPanPoint(pos);
      return;
    }

    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pos.x - viewOffset.x) / (zoom / 10),
      y: (pos.y - viewOffset.y) / (zoom / 10)
    };
    const snappedPos = {
      x: Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE
    };

    if (tool === 'wall') {
      if (!isDrawing) {
        setCurrentWall(snappedPos);
        setIsDrawing(true);
      } else {
        // Complete the wall
        if (currentWall) {
          const newWall: Wall = {
            id: Date.now().toString(),
            start: currentWall,
            end: snappedPos
          };
          const newWalls = [...walls, newWall];
          setWalls(newWalls);
          onWallsChange?.(newWalls);
        }
        setCurrentWall(null);
        setIsDrawing(false);
      }
    } else if (tool === 'erase') {
      // Find wall to delete
      const wallToDelete = walls.find(wall => {
        const startScreen = { x: wall.start.x * (zoom / 10) + viewOffset.x, y: wall.start.y * (zoom / 10) + viewOffset.y };
        const endScreen = { x: wall.end.x * (zoom / 10) + viewOffset.x, y: wall.end.y * (zoom / 10) + viewOffset.y };
        const distToStart = Math.sqrt(Math.pow(startScreen.x - pos.x, 2) + Math.pow(startScreen.y - pos.y, 2));
        const distToEnd = Math.sqrt(Math.pow(endScreen.x - pos.x, 2) + Math.pow(endScreen.y - pos.y, 2));
        return distToStart < 15 || distToEnd < 15;
      });

      if (wallToDelete) {
        const newWalls = walls.filter(w => w.id !== wallToDelete.id);
        setWalls(newWalls);
        onWallsChange?.(newWalls);
      }
    }
  }, [tool, isDrawing, currentWall, walls, getMousePos, onWallsChange, zoom, viewOffset]);

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
    
    const worldPos = {
      x: (pos.x - viewOffset.x) / (zoom / 10),
      y: (pos.y - viewOffset.y) / (zoom / 10)
    };
    const gridPos = {
      x: Math.round(worldPos.x / GRID_SIZE),
      y: Math.round(worldPos.y / GRID_SIZE)
    };
    onCoordinateChange?.(gridPos);
  }, [getMousePos, isPanning, lastPanPoint, zoom, viewOffset, onCoordinateChange]);

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

  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setCanvasSize({
          width: Math.floor(rect.width / GRID_SIZE) * GRID_SIZE,
          height: Math.floor((rect.height - 100) / GRID_SIZE) * GRID_SIZE
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="flex-1 overflow-hidden">
      {/* Modern canvas container with shadow and border */}
      <div className="h-full bg-canvas border border-canvas-border rounded-xl shadow-lg shadow-canvas-shadow/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
        className={cn(
          "cursor-crosshair touch-none",
          tool === 'erase' && "cursor-not-allowed",
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
    </div>
  );
};