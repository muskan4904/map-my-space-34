import React, { useState, useCallback } from 'react';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanToolbar } from './FloorPlanToolbar';

interface Wall {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  selected?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 100;

export const FloorPlanApp: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'wall' | 'erase'>('wall');
  const [walls, setWalls] = useState<Wall[]>([]);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(10); // Start at 10% for full view

  const handleToolChange = useCallback((tool: 'select' | 'wall' | 'erase') => {
    setActiveTool(tool);
  }, []);

  const handleWallsChange = useCallback((newWalls: Wall[]) => {
    setWalls(newWalls);
  }, []);

  const handleCoordinateChange = useCallback((point: { x: number; y: number } | null) => {
    setCoordinates(point);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 5, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 5, MIN_ZOOM));
  }, []);

  const handleClear = useCallback(() => {
    setWalls([]);
  }, []);

  const handleExport = useCallback(() => {
    if (walls.length === 0) {
      return;
    }

    // Create a temporary canvas for export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    const GRID_SIZE = 20;
    const GRID_MAJOR_INTERVAL = 5;

    // Minor grid lines
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Major grid lines
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE * GRID_MAJOR_INTERVAL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE * GRID_MAJOR_INTERVAL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw walls
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    walls.forEach(wall => {
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();

      // Draw endpoints
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(wall.start.x, wall.start.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wall.end.x, wall.end.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Floor Plan', canvas.width / 2, 30);

    // Add scale indicator
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Scale: 1 grid unit = 1 meter', 10, canvas.height - 10);

    // Export as image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `floor-plan-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }, [walls]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">FloorPlan Creator</h1>
            <p className="text-sm text-muted-foreground">
              Tap to draw walls • {walls.length} walls drawn
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Mobile-optimized CAD
            </p>
            <p className="text-xs font-mono text-primary">
              Grid: 500×500 units
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative pb-20 md:pb-4">
        {/* Measurement Display - Outside Canvas */}
        {coordinates && (
          <div className="absolute top-4 right-4 z-10 bg-measurement-bg border border-measurement-border rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-measurement rounded-full"></div>
              <span className="font-medium text-measurement">Position:</span>
              <span className="font-mono text-measurement">X: {coordinates.x}, Y: {coordinates.y}</span>
            </div>
          </div>
        )}
        
        <div className="flex-1 p-4">
          <FloorPlanCanvas
            tool={activeTool}
            onWallsChange={handleWallsChange}
            onCoordinateChange={handleCoordinateChange}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>

        {/* Toolbar */}
        <FloorPlanToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onClear={handleClear}
          onExport={handleExport}
          coordinates={coordinates}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>
    </div>
  );
};