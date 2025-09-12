import React, { useState, useCallback } from 'react';
import { EnhancedRoomCanvas } from './EnhancedRoomCanvas';
import { RoomToolbar } from './RoomToolbar';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Room {
  id: string;
  points: { x: number; y: number }[];
  label: string;
  area: number;
  color: string;
  selected?: boolean;
}

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;

export const RoomMapApp: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'room' | 'label' | 'erase' | 'freehand' | null>('freehand');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(100); // Start at 100% for balanced view
  const [selectedColor, setSelectedColor] = useState('#000000'); // Default black color for freehand
  const [canPanUp, setCanPanUp] = useState(false);
  const [canPanLeft, setCanPanLeft] = useState(false);

  const handleToolChange = useCallback((tool: 'select' | 'room' | 'label' | 'erase' | 'freehand' | null) => {
    setActiveTool(tool);
  }, []);

  const handleRoomsChange = useCallback((newRooms: Room[]) => {
    setRooms(newRooms);
  }, []);

  const handleCoordinateChange = useCallback((point: { x: number; y: number } | null) => {
    setCoordinates(point);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, MIN_ZOOM));
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM * 2.5))); // Allow higher zoom for pinch
  }, []);

  const handleClear = useCallback(() => {
    if ((window as any).roomCanvasClear) {
      (window as any).roomCanvasClear();
    }
    setRooms([]);
    setCoordinates(null);
  }, []);

  const handleUndo = useCallback(() => {
    if ((window as any).roomCanvasUndo) {
      (window as any).roomCanvasUndo();
    }
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleExport = useCallback(() => {
    if ((window as any).roomCanvasExport) {
      (window as any).roomCanvasExport();
    }
  }, []);

  const handlePanCanvas = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if ((window as any).roomCanvasPan) {
      (window as any).roomCanvasPan(direction);
    }
  }, []);

  const handlePanCapabilitiesChange = useCallback((canUp: boolean, canLeft: boolean) => {
    setCanPanUp(canUp);
    setCanPanLeft(canLeft);
  }, []);

  // Calculate total area
  const totalArea = rooms.reduce((sum, room) => sum + room.area, 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Mobile Header - Compact */}
      <header className="md:hidden border-b border-border bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">Room Mapper</h1>
            <p className="text-xs text-muted-foreground">
              {rooms.length} rooms • {totalArea.toFixed(0)} sq ft
            </p>
          </div>
          <Button 
            onClick={handleExport}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block border-b border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Room Mapper</h1>
            <p className="text-sm text-muted-foreground">
              Room planning with area calculation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-semibold text-primary">
                {rooms.length} rooms • {totalArea.toFixed(0)} sq ft total
              </p>
            </div>
            <Button 
              onClick={handleExport}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
              size="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Map
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height Canvas */}
      <div className="flex-1 flex flex-col min-h-0">        
        <div className="flex-1 min-h-0">
          <EnhancedRoomCanvas
            tool={activeTool}
            onRoomsChange={handleRoomsChange}
            onCoordinateChange={handleCoordinateChange}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            selectedColor={selectedColor}
            onPanCapabilitiesChange={handlePanCapabilitiesChange}
          />
        </div>

        {/* Toolbar */}
        <RoomToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onClear={handleClear}
          onExport={handleExport}
          onUndo={handleUndo}
          coordinates={coordinates}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          roomCount={rooms.length}
          totalArea={totalArea}
          onPanCanvas={handlePanCanvas}
          canPanUp={canPanUp}
          canPanLeft={canPanLeft}
        />
      </div>
    </div>
  );
};