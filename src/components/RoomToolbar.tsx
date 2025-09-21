import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MousePointer, 
  Square, 
  Type,
  Eraser, 
  Download, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Palette,
  Home,
  Pen,
  Undo,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomToolbarProps {
  activeTool: 'select' | 'room' | 'label' | 'erase' | 'freehand' | null;
  onToolChange: (tool: 'select' | 'room' | 'label' | 'erase' | 'freehand' | null) => void;
  onClear: () => void;
  onExport: () => void;
  onUndo: () => void;
  coordinates?: { x: number; y: number } | null;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  roomCount: number;
  totalArea: number;
  onPanCanvas?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  canPanUp?: boolean;
  canPanLeft?: boolean;
}

const ROOM_COLORS = [
  '#000000', '#FF6B6B40', '#4ECDC440', '#45B7D140', '#96CEB440', 
  '#FFEAA740', '#DDA0DD40', '#98D8C840', '#F7DC6F40'
];

export const RoomToolbar: React.FC<RoomToolbarProps> = ({
  activeTool,
  onToolChange,
  onClear,
  onExport,
  onUndo,
  coordinates,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  selectedColor,
  onColorChange,
  roomCount,
  totalArea,
  onPanCanvas,
  canPanUp = true,
  canPanLeft = true
}) => {
  const tools = [
    { id: 'freehand' as const, icon: Pen, label: 'Freehand Draw' },
    { id: 'room' as const, icon: Square, label: 'Draw Room (Square/Rectangle with Dimensions)' },
    { id: 'label' as const, icon: Type, label: 'Add Label' },
    { id: 'erase' as const, icon: Eraser, label: 'Delete' },
  ];

  return (
    <>
      {/* Mobile Toolbar - Compact */}
      <Card className="md:hidden fixed bottom-6 left-2 right-2 z-50 bg-toolbar border-toolbar-border shadow-xl mb-6">
        <div className="p-2 space-y-2">
          {/* Primary Tools Row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 w-9 p-0 transition-all duration-200",
                    activeTool === tool.id
                      ? "bg-tool-active text-tool-active-foreground shadow-md scale-105"
                      : "bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                  )}
                  onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>


            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-7 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={onZoomOut}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <div className="px-1 py-1 text-xs font-mono bg-secondary rounded min-w-10 text-center">
                {zoom}%
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-7 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={onZoomIn}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            {/* Action Tools */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-info/10 hover:text-info"
                onClick={onUndo}
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-warning/10 hover:text-warning"
                onClick={onClear}
                title="Clear All"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-success/10 hover:text-success"
                onClick={onExport}
                title="Export Image"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Color Picker & Stats Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Palette className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {ROOM_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 flex-shrink-0 transition-all",
                      selectedColor === color 
                        ? "border-primary scale-110 shadow-md" 
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: color.includes('40') ? color.replace('40', '') : color }}
                    onClick={() => onColorChange(color)}
                  />
                ))}
              </div>
            </div>

            {/* Direction Controls */}
            <div className="flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={() => onPanCanvas?.('up')}
                title="Pan Up"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                  onClick={() => onPanCanvas?.('left')}
                  title="Pan Left"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                  onClick={() => onPanCanvas?.('right')}
                  title="Pan Right"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={() => onPanCanvas?.('down')}
                title="Pan Down"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {roomCount} rooms • {totalArea.toFixed(0)} sq ft
            </div>
          </div>
        </div>
      </Card>

      {/* Desktop Toolbar */}
      <Card className="hidden md:block bg-toolbar border-toolbar-border shadow-lg">
        <div className="flex items-center justify-between p-4 gap-4">
          {/* Drawing Tools */}
          <div className="flex gap-2">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-12 w-12 p-0 transition-all duration-200",
                  activeTool === tool.id
                    ? "bg-tool-active text-tool-active-foreground shadow-md"
                    : "bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                )}
                onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              >
                <tool.icon className="h-5 w-5" />
                <span className="sr-only">{tool.label}</span>
              </Button>
            ))}
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {ROOM_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    selectedColor === color 
                      ? "border-primary scale-110 shadow-md" 
                      : "border-border hover:border-primary/50"
                  )}
                  style={{ backgroundColor: color.includes('40') ? color.replace('40', '') : color }}
                  onClick={() => onColorChange(color)}
                />
              ))}
            </div>
          </div>

          {/* Direction Controls */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={() => onPanCanvas?.('up')}
              title="Pan Up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={() => onPanCanvas?.('left')}
                title="Pan Left"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
                onClick={() => onPanCanvas?.('right')}
                title="Pan Right"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={() => onPanCanvas?.('down')}
              title="Pan Down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 px-3 py-1 bg-secondary rounded-md">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Rooms: {roomCount}</span>
            </div>
            <div className="text-sm text-foreground">
              Total: {totalArea.toFixed(0)} sq ft
            </div>
          </div>

          {/* Coordinates */}
          {coordinates && (
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-md">
              <span className="text-sm font-mono text-foreground">
                X: {coordinates.x}, Y: {coordinates.y}
              </span>
            </div>
          )}


          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={onZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-2 py-1 text-xs font-mono bg-secondary rounded min-w-12 text-center">
              {zoom}%
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={onZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Tools */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-info/10 hover:text-info"
              onClick={onUndo}
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-warning/10 hover:text-warning"
              onClick={onClear}
              title="Clear All"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-success/10 hover:text-success"
              onClick={onExport}
              title="Export Image"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};