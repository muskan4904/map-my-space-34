import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MousePointer, 
  Minus, 
  Eraser, 
  Download, 
  RotateCcw,
  Grid3X3,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloorPlanToolbarProps {
  activeTool: 'select' | 'wall' | 'erase';
  onToolChange: (tool: 'select' | 'wall' | 'erase') => void;
  onClear: () => void;
  onExport: () => void;
  coordinates?: { x: number; y: number } | null;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const FloorPlanToolbar: React.FC<FloorPlanToolbarProps> = ({
  activeTool,
  onToolChange,
  onClear,
  onExport,
  coordinates,
  zoom = 1,
  onZoomIn,
  onZoomOut
}) => {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select' },
    { id: 'wall' as const, icon: Minus, label: 'Draw Wall' },
    { id: 'erase' as const, icon: Eraser, label: 'Erase' },
  ];

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 bg-toolbar border-toolbar-border shadow-lg md:relative md:bottom-auto md:left-auto md:right-auto">
      <div className="flex items-center justify-between p-3 gap-2">
        {/* Drawing Tools */}
        <div className="flex gap-1">
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
              onClick={() => onToolChange(tool.id)}
            >
              <tool.icon className="h-5 w-5" />
              <span className="sr-only">{tool.label}</span>
            </Button>
          ))}
        </div>

        {/* Coordinates Display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-secondary rounded-md">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground">
            {coordinates ? `X: ${coordinates.x}, Y: ${coordinates.y}` : 'X: -, Y: -'}
          </span>
        </div>

        {/* Zoom Controls - Always visible */}
        {onZoomIn && onZoomOut && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={onZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
              <span className="sr-only">Zoom Out</span>
            </Button>
            <div className="px-2 py-1 text-xs font-mono bg-secondary rounded min-w-12 text-center">
              {zoom}%
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-8 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-tool-active/10"
              onClick={onZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
              <span className="sr-only">Zoom In</span>
            </Button>
          </div>
        )}

        {/* Action Tools */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-warning/10 hover:text-warning"
            onClick={onClear}
          >
            <RotateCcw className="h-5 w-5" />
            <span className="sr-only">Clear All</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 p-0 bg-tool-inactive text-tool-inactive-foreground hover:bg-success/10 hover:text-success"
            onClick={onExport}
          >
            <Download className="h-5 w-5" />
            <span className="sr-only">Export</span>
          </Button>
        </div>
      </div>

      {/* Mobile Coordinates and Zoom */}
      <div className="sm:hidden border-t border-toolbar-border px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">
              {coordinates ? `X: ${coordinates.x}, Y: ${coordinates.y}` : 'Position: -'}
            </span>
          </div>
          {onZoomIn && onZoomOut && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Zoom:</span>
              <span className="text-xs font-mono">{zoom}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};