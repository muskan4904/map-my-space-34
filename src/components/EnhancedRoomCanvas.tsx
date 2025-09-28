import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, FabricImage, Polygon, FabricObject } from 'fabric';

// Import furniture images
import bedImage from '@/assets/furniture/bed.png';
import sofaImage from '@/assets/furniture/sofa.png';
import armchairImage from '@/assets/furniture/armchair.png';
import tableImage from '@/assets/furniture/table.png';
import refrigeratorImage from '@/assets/furniture/refrigerator.png';
import bathtubImage from '@/assets/furniture/bathtub.png';
import wardrobeImage from '@/assets/furniture/wardrobe.png';

// Furniture image mapping
const FURNITURE_IMAGES: Record<string, string> = {
  'bed-single': bedImage,
  'bed-double': bedImage,
  'bed-king': bedImage,
  'sofa-2seat': sofaImage,
  'sofa-3seat': sofaImage,
  'armchair': armchairImage,
  'coffee-table': tableImage,
  'dining-table': tableImage,
  'side-table': tableImage,
  'refrigerator': refrigeratorImage,
  'stove': refrigeratorImage,
  'kitchen-island': tableImage,
  'dining-chair': armchairImage,
  'bathtub': bathtubImage,
  'shower': bathtubImage,
  'toilet': bathtubImage,
  'sink': bathtubImage,
  'wardrobe': wardrobeImage,
  'nightstand': wardrobeImage,
  'tv-stand': wardrobeImage,
  'door': wardrobeImage,
  'window': wardrobeImage
};

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
}

interface EnhancedRoomCanvasProps {
  tool: 'select' | 'room' | 'label' | 'erase' | 'freehand' | null;
  onRoomsChange?: (rooms: Room[]) => void;
  onCoordinateChange?: (point: Point | null) => void;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  selectedColor: string;
  onPanCanvas?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onPanCapabilitiesChange?: (canUp: boolean, canLeft: boolean) => void;
  onUndo?: () => void;
  selectedFurniture?: { id: string; name: string; width: number; height: number; color: string; shape: 'rectangle' | 'circle' } | null;
}

export interface EnhancedRoomCanvasRef {
  undo: () => void;
  exportCanvas: () => void;
  clearCanvas: () => void;
  addFurniture: (furnitureData: any, x: number, y: number) => void;
}

const CANVAS_CONFIG = {
  width: 1200,
  height: 800
};

export const EnhancedRoomCanvas = React.forwardRef<EnhancedRoomCanvasRef, EnhancedRoomCanvasProps>(({
  tool,
  onRoomsChange,
  onCoordinateChange,
  zoom,
  onZoomChange,
  selectedColor,
  onPanCanvas,
  onPanCapabilitiesChange,
  onUndo,
  selectedFurniture
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [roomCount, setRoomCount] = useState(0);
  const [totalArea, setTotalArea] = useState(0);
  const [mode, setMode] = useState<string>('freehand');

  // Update mode when tool changes
  useEffect(() => {
    setMode(tool || 'select');
  }, [tool]);

  // Save canvas state for undo functionality
  const saveCanvasState = useCallback(() => {
    if (!fabricCanvas) return;
    
    const state = JSON.stringify(fabricCanvas.toJSON());
    setCanvasHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [fabricCanvas, historyIndex]);

  // Calculate polygon area
  const calculatePolygonArea = useCallback((points: Point[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }, []);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0 && fabricCanvas) {
      const newIndex = historyIndex - 1;
      const state = canvasHistory[newIndex];
      
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
        
        // Update room count and area
        const objects = fabricCanvas.getObjects();
        const rooms = objects.filter(obj => obj.type === 'polygon');
        setRoomCount(rooms.length);
        
        const totalArea = rooms.reduce((sum, room) => {
          const area = calculatePolygonArea((room as any).points || []);
          return sum + area;
        }, 0);
        setTotalArea(totalArea);
      });
    }
  }, [historyIndex, canvasHistory, fabricCanvas, calculatePolygonArea]);

  // Export canvas
  const exportCanvas = useCallback(() => {
    if (!fabricCanvas) return;

    // Export as PNG
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // Higher resolution
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `room-map-${new Date().getTime()}.png`;
    link.href = dataURL;
    link.click();
  }, [fabricCanvas]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
    setRoomCount(0);
    setTotalArea(0);
    saveCanvasState();
  }, [fabricCanvas, saveCanvasState]);

  // Add furniture to canvas
  const addFurniture = useCallback((furnitureData: any, x: number, y: number) => {
    if (!fabricCanvas) return;

    const imageKey = furnitureData.imageKey || furnitureData.id;
    const imagePath = FURNITURE_IMAGES[imageKey] || FURNITURE_IMAGES['bed-single'];
    
    // Create a fabric image
    FabricImage.fromURL(imagePath).then((img) => {
      if (!img) return;
      
      const gridSize = 20;
      const furnitureWidth = furnitureData.width * gridSize;
      const furnitureHeight = furnitureData.height * gridSize;
      
      // Add custom properties
      (img as any).furnitureData = furnitureData;
      (img as any).objectType = 'furniture';
      
      img.set({
        left: x,
        top: y,
        scaleX: furnitureWidth / (img.width || 1),
        scaleY: furnitureHeight / (img.height || 1),
        selectable: true,
        evented: true,
        hasControls: false, // Hide controls initially
        hasBorders: false,  // Hide borders initially
        transparentCorners: false,
        cornerColor: '#2563eb',
        cornerStyle: 'rect',
        borderColor: '#2563eb',
        borderScaleFactor: 2,
        padding: 5
      });

      fabricCanvas.add(img);
      fabricCanvas.renderAll();
      
      // Add to history for undo functionality
      saveCanvasState();
    }).catch((error) => {
      console.error('Error loading furniture image:', error);
    });
  }, [fabricCanvas, saveCanvasState]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up existing canvas
    if (fabricCanvas) {
      fabricCanvas.dispose();
    }

    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: CANVAS_CONFIG.width,
        height: CANVAS_CONFIG.height,
        backgroundColor: '#ffffff',
        selection: mode === 'select'
      });

      console.log('Fabric canvas initialized:', canvas);

      // Add basic grid background
      const drawGrid = () => {
        const gridSize = 20;
        const ctx = canvas.getContext();
        
        // Clear and set background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
        
        // Draw grid lines
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= CANVAS_CONFIG.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_CONFIG.height);
          ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= CANVAS_CONFIG.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_CONFIG.width, y);
          ctx.stroke();
        }
      };

      // Draw initial grid
      drawGrid();

      // Handle double-click for furniture selection/deselection
      canvas.on('mouse:dblclick', (e) => {
        const target = e.target;
        if (target && (target as any).objectType === 'furniture') {
          // Toggle controls and borders on double-click
          target.set({
            hasControls: !target.hasControls,
            hasBorders: !target.hasBorders
          });
          canvas.renderAll();
        }
      });

      // Handle selection events
      canvas.on('selection:created', (e) => {
        const target = canvas.getActiveObject();
        if (target && (target as any).objectType === 'furniture') {
          // Show subtle border when selected (single click)
          target.set({
            hasBorders: true,
            hasControls: false,
            borderColor: '#2563eb',
            borderOpacity: 0.5
          });
          canvas.renderAll();
        }
      });

      canvas.on('selection:cleared', () => {
        // Hide all controls and borders when selection is cleared
        canvas.getObjects().forEach(obj => {
          if ((obj as any).objectType === 'furniture') {
            obj.set({
              hasControls: false,
              hasBorders: false
            });
          }
        });
        canvas.renderAll();
      });

      // Handle object movement for save state
      canvas.on('object:modified', () => {
        saveCanvasState();
      });

      // Handle drop for furniture from palette
      if (canvas.wrapperEl) {
        canvas.wrapperEl.addEventListener('dragover', (e) => {
          e.preventDefault();
        });

        canvas.wrapperEl.addEventListener('drop', (e) => {
          e.preventDefault();
          try {
            const furnitureData = JSON.parse(e.dataTransfer?.getData('application/json') || '{}');
            if (furnitureData.id) {
              const rect = canvas.wrapperEl!.getBoundingClientRect();
              const pointer = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };
              addFurniture(furnitureData, pointer.x, pointer.y);
            }
          } catch (error) {
            console.error('Error parsing dropped furniture data:', error);
          }
        });
      }

      setFabricCanvas(canvas);

      // Save initial state
      setTimeout(() => {
        const state = JSON.stringify(canvas.toJSON());
        setCanvasHistory([state]);
        setHistoryIndex(0);
      }, 100);

      return () => {
        canvas.dispose();
      };
    } catch (error) {
      console.error('Error initializing Fabric canvas:', error);
    }
  }, []); // Only run once on mount

  // Set up drawing mode based on selected tool
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = mode === 'freehand';
    
    if (mode === 'freehand' && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = selectedColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    }

    fabricCanvas.selection = mode === 'select';

    // Set cursor based on mode
    if (mode === 'room') {
      fabricCanvas.defaultCursor = 'crosshair';
    } else if (mode === 'freehand') {
      fabricCanvas.defaultCursor = 'crosshair';
    } else if (mode === 'erase') {
      fabricCanvas.defaultCursor = 'not-allowed';
    } else {
      fabricCanvas.defaultCursor = 'default';
    }

  }, [mode, selectedColor, fabricCanvas]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    undo,
    exportCanvas,
    clearCanvas,
    addFurniture
  }));

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-gray-50"
      >
        <canvas 
          ref={canvasRef}
          width={CANVAS_CONFIG.width}
          height={CANVAS_CONFIG.height}
          className="border border-gray-300 bg-white shadow-lg" 
          style={{ 
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'block'
          }}
        />
      </div>
      
      {/* Room count and area display */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <div className="text-sm font-medium text-gray-900">
          {roomCount} rooms • {totalArea.toFixed(0)} sq ft total
        </div>
      </div>

      {/* Drawing mode indicator */}
      {mode && mode !== 'select' && (
        <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="text-sm font-medium text-white">
            {mode === 'room' && 'Click to add room points'}
            {mode === 'freehand' && 'Draw freehand'}
            {mode === 'label' && 'Click to add label'}
            {mode === 'erase' && 'Click to erase'}
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedRoomCanvas.displayName = 'EnhancedRoomCanvas';