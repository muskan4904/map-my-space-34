import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { X, Check } from 'lucide-react';

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

interface FreehandPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface TextLabel {
  id: string;
  position: Point;
  text: string;
  color: string;
  fontSize: number;
}

interface CanvasAction {
  type: 'room' | 'freehand' | 'text' | 'delete';
  data: Room | FreehandPath | TextLabel | { ids: string[], types: string[] };
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
}

export const EnhancedRoomCanvas: React.FC<EnhancedRoomCanvasProps> = ({
  tool,
  onRoomsChange,
  onCoordinateChange,
  zoom,
  onZoomChange,
  selectedColor,
  onPanCanvas,
  onPanCapabilitiesChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([]);
  const [textLabels, setTextLabels] = useState<TextLabel[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Point[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [viewOffset, setViewOffset] = useState({ x: 50, y: 50 });
  const [canPanUp, setCanPanUp] = useState(false);
  const [canPanLeft, setCanPanLeft] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actionHistory, setActionHistory] = useState<CanvasAction[]>([]);
  const [textInput, setTextInput] = useState<{position: Point, value: string, isEditing: boolean, editingId?: string} | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState<{id: string, offset: Point} | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedText, setLastClickedText] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('');
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [lastPinchZoom, setLastPinchZoom] = useState(100);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSliderValue, setMobileSliderValue] = useState(50);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  
  // Handle tool change and tooltip timing
  useEffect(() => {
    if (tool !== currentTool) {
      console.log('Tool changed from', currentTool, 'to', tool);
      
      // Clear any in-progress drawing states when switching tools
      if (currentTool === 'room' && tool !== 'room') {
        console.log('Clearing currentRoom state due to tool change');
        setCurrentRoom([]);
        setIsRoomClosed(false);
      }
      if (currentTool === 'freehand' && tool !== 'freehand') {
        setCurrentPath([]);
        setIsDrawing(false);
      }
      
      setCurrentTool(tool);
      setShowTooltip(true);
      
      // Clear any existing timer
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
      
      // Set new timer
      tooltipTimerRef.current = setTimeout(() => {
        setShowTooltip(false);
        tooltipTimerRef.current = null;
      }, 5000);
    }
  }, [tool, currentTool]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile slider effect - update view offset based on slider
  useEffect(() => {
    if (isMobile) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxOffset = 200; // Maximum offset in pixels
      
      // Convert slider value (0-100) to offset
      const offsetX = (mobileSliderValue - 50) * (maxOffset / 50);
      const offsetY = (mobileSliderValue - 50) * (maxOffset / 50);
      
      setViewOffset(prev => ({
        x: 50 + offsetX,
        y: 50 + offsetY
      }));
    }
  }, [mobileSliderValue, isMobile]);
  
  const GRID_SIZE = 20;
  
  // Dynamic grid configuration based on zoom level
  const getGridConfig = useCallback((zoom: number) => {
    if (zoom >= 200) {
      return { majorInterval: 1, minorInterval: 0.5, showMinor: true };
    } else if (zoom >= 150) {
      return { majorInterval: 1, minorInterval: 1, showMinor: false };
    } else if (zoom >= 100) {
      return { majorInterval: 5, minorInterval: 1, showMinor: true };
    } else if (zoom >= 75) {
      return { majorInterval: 10, minorInterval: 5, showMinor: true };
    } else {
      return { majorInterval: 25, minorInterval: 5, showMinor: false };
    }
  }, []);

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

  // Check if a 4-point polygon is a rectangle
  const checkIfRectangle = useCallback((points: Point[]): boolean => {
    if (points.length !== 4) return false;
    
    // Check if opposite sides are parallel and equal
    // For a rectangle in grid coordinates, we expect:
    // - Two pairs of parallel sides
    // - All angles to be 90 degrees (or close enough for grid alignment)
    
    const sides = [];
    for (let i = 0; i < 4; i++) {
      const current = points[i];
      const next = points[(i + 1) % 4];
      sides.push({
        dx: next.x - current.x,
        dy: next.y - current.y,
        length: Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2))
      });
    }
    
    // Check if opposite sides are equal and parallel
    const side1 = sides[0];
    const side2 = sides[1];
    const side3 = sides[2];
    const side4 = sides[3];
    
    // For a rectangle: side1 should be parallel to side3, side2 should be parallel to side4
    const parallel13 = Math.abs(side1.dx * side3.dy - side1.dy * side3.dx) < 0.1;
    const parallel24 = Math.abs(side2.dx * side4.dy - side2.dy * side4.dx) < 0.1;
    
    // Check if opposite sides have same length
    const equalLength13 = Math.abs(side1.length - side3.length) < 0.1;
    const equalLength24 = Math.abs(side2.length - side4.length) < 0.1;
    
    // Check if adjacent sides are perpendicular
    const perpendicular12 = Math.abs(side1.dx * side2.dx + side1.dy * side2.dy) < 0.1;
    
    return parallel13 && parallel24 && equalLength13 && equalLength24 && perpendicular12;
  }, []);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (actionHistory.length === 0) return;
    
    const lastAction = actionHistory[actionHistory.length - 1];
    
    switch (lastAction.type) {
      case 'room':
        setRooms(prev => prev.filter(room => room.id !== (lastAction.data as Room).id));
        break;
      case 'freehand':
        setFreehandPaths(prev => prev.filter(path => path.id !== (lastAction.data as FreehandPath).id));
        break;
      case 'text':
        setTextLabels(prev => prev.filter(label => label.id !== (lastAction.data as TextLabel).id));
        break;
      case 'delete':
        const deleteData = lastAction.data as { ids: string[], types: string[] };
        // Restore deleted items (this would need more complex state management in a real app)
        break;
    }
    
    setActionHistory(prev => prev.slice(0, -1));
  }, [actionHistory]);

  // Export canvas without grid
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Find bounds of all drawn content in grid coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasContent = false;
    
    // Check rooms
    rooms.forEach(room => {
      if (room.points.length >= 3) {
        hasContent = true;
        room.points.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      }
    });
    
    // Check freehand paths
    freehandPaths.forEach(path => {
      if (path.points.length >= 2) {
        hasContent = true;
        path.points.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      }
    });
    
    // Check text labels
    textLabels.forEach(label => {
      hasContent = true;
      minX = Math.min(minX, label.position.x - 2);
      minY = Math.min(minY, label.position.y - 1);
      maxX = Math.max(maxX, label.position.x + 2);
      maxY = Math.max(maxY, label.position.y + 1);
    });
    
    if (!hasContent) {
      alert('No content to export. Please draw something first.');
      return;
    }
    
    // Add padding in grid units
    const gridPadding = 2;
    minX -= gridPadding;
    minY -= gridPadding;
    maxX += gridPadding;
    maxY += gridPadding;
    
    // Calculate export dimensions based on content bounds
    const gridWidth = maxX - minX;
    const gridHeight = maxY - minY;
    
    // Calculate professional export dimensions
    // Base scale for good visual quality (pixels per grid unit)
    const baseScale = 40; // Increased from 20 for better quality
    
    // Calculate ideal dimensions
    let exportWidth = gridWidth * baseScale;
    let exportHeight = gridHeight * baseScale;
    
    // Set professional size constraints
    const minExportSize = 800; // Minimum dimension for professional quality
    const maxExportSize = 2400; // Maximum to prevent overly large files
    
    // Ensure minimum professional size
    if (Math.max(exportWidth, exportHeight) < minExportSize) {
      const scaleUpFactor = minExportSize / Math.max(exportWidth, exportHeight);
      exportWidth *= scaleUpFactor;
      exportHeight *= scaleUpFactor;
    }
    
    // Limit maximum size while maintaining aspect ratio
    if (Math.max(exportWidth, exportHeight) > maxExportSize) {
      const scaleDownFactor = maxExportSize / Math.max(exportWidth, exportHeight);
      exportWidth *= scaleDownFactor;
      exportHeight *= scaleDownFactor;
    }
    
    // Calculate the final scale factor
    const exportScale = exportWidth / gridWidth;
    
    // Create high-resolution export canvas
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;
    
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    
    // Set high quality rendering
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';
    
    // White background
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Helper function to convert grid coords to export canvas coords
    const gridToExportCanvas = (point: Point): Point => ({
      x: (point.x - minX) * exportScale,
      y: (point.y - minY) * exportScale
    });
    
    // Draw rooms
    rooms.forEach(room => {
      if (room.points.length < 3) return;
      const exportPoints = room.points.map(gridToExportCanvas);
      
      exportCtx.fillStyle = room.color;
      exportCtx.beginPath();
      exportCtx.moveTo(exportPoints[0].x, exportPoints[0].y);
      exportPoints.slice(1).forEach(point => {
        exportCtx.lineTo(point.x, point.y);
      });
      exportCtx.closePath();
      exportCtx.fill();
      
      exportCtx.strokeStyle = '#333333';
      exportCtx.lineWidth = 2;
      exportCtx.stroke();
      
      // Draw room measurements (always on mobile; desktop for rectangles or selected rooms)
      {
        const isRectangle = room.points.length === 4 && checkIfRectangle(room.points);
        const shouldShowMeasurements = isMobile || room.selected || isRectangle;
        
        if (shouldShowMeasurements) {
          const xs = room.points.map(p => p.x);
          const ys = room.points.map(p => p.y);
          const width = Math.abs(Math.max(...xs) - Math.min(...xs));
          const height = Math.abs(Math.max(...ys) - Math.min(...ys));
          
          if (width > 0 && height > 0) {
            // Calculate center for dimension text
            const centerX = exportPoints.reduce((sum, p) => sum + p.x, 0) / exportPoints.length;
            const centerY = exportPoints.reduce((sum, p) => sum + p.y, 0) / exportPoints.length;
            
            const fontSize = Math.max(14, exportScale * 0.8);
            exportCtx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            
            // Add background for better readability
            const dimensionText = `${width}×${height} ft`;
            const textMetrics = exportCtx.measureText(dimensionText);
            const padding = Math.max(6, fontSize * 0.3);
            
            exportCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            exportCtx.fillRect(
              centerX - textMetrics.width / 2 - padding,
              centerY - fontSize / 2 - padding / 2,
              textMetrics.width + padding * 2,
              fontSize + padding
            );
            
            exportCtx.fillStyle = '#000000';
            exportCtx.fillText(dimensionText, centerX, centerY);
          }
        }
      }
    });
    
    // Draw freehand paths
    freehandPaths.forEach(path => {
      if (path.points.length < 2) return;
      const exportPoints = path.points.map(gridToExportCanvas);
      
      exportCtx.strokeStyle = path.color.replace('40', '');
      exportCtx.lineWidth = Math.max(2, path.width * 0.8);
      exportCtx.lineCap = 'round';
      exportCtx.lineJoin = 'round';
      
      exportCtx.beginPath();
      exportCtx.moveTo(exportPoints[0].x, exportPoints[0].y);
      exportPoints.slice(1).forEach(point => {
        exportCtx.lineTo(point.x, point.y);
      });
      exportCtx.stroke();
    });
    
    // Draw text labels
    textLabels.forEach(label => {
      const exportPos = gridToExportCanvas(label.position);
      exportCtx.fillStyle = label.color;
      exportCtx.font = `${Math.max(12, label.fontSize * 0.8)}px Arial`;
      exportCtx.textAlign = 'left';
      exportCtx.fillText(label.text, exportPos.x, exportPos.y);
    });
    
    // Download the image
    const link = document.createElement('a');
    link.download = `room-map-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = exportCanvas.toDataURL('image/png', 1.0);
    link.click();
    
    console.log('Map exported successfully!');
  }, [rooms, freehandPaths, textLabels, isMobile, checkIfRectangle]);

  // Clear canvas
  const handleClear = useCallback(() => {
    setRooms([]);
    setFreehandPaths([]);
    setTextLabels([]);
    setCurrentRoom([]);
    setCurrentPath([]);
    setActionHistory([]);
    setTextInput(null);
    setIsRoomClosed(false);
    onRoomsChange?.([]);
  }, [onRoomsChange]);

  // Pan canvas in specified direction
  const handlePanCanvas = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const panAmount = 50; // pixels to pan
    setViewOffset(prev => {
      let newOffset = { ...prev };
      
      switch (direction) {
        case 'up':
          newOffset.y = prev.y + panAmount;
          break;
        case 'down':
          newOffset.y = prev.y - panAmount;
          break;
        case 'left':
          newOffset.x = prev.x + panAmount;
          break;
        case 'right':
          newOffset.x = prev.x - panAmount;
          break;
        default:
          return prev;
      }
      
      return newOffset;
    });
  }, []);
  
  // Update pan capabilities based on current view offset
  useEffect(() => {
    const newCanPanUp = viewOffset.y >= 50;
    const newCanPanLeft = viewOffset.x >= 50;
    setCanPanUp(newCanPanUp);
    setCanPanLeft(newCanPanLeft);
    onPanCapabilitiesChange?.(newCanPanUp, newCanPanLeft);
  }, [viewOffset, onPanCapabilitiesChange]);

  // Check if point is inside room
  const isPointInRoom = useCallback((point: Point, room: Room): boolean => {
    const screenPoints = room.points.map(gridToScreen);
    let inside = false;
    
    for (let i = 0, j = screenPoints.length - 1; i < screenPoints.length; j = i++) {
      if (((screenPoints[i].y > point.y) !== (screenPoints[j].y > point.y)) &&
          (point.x < (screenPoints[j].x - screenPoints[i].x) * (point.y - screenPoints[i].y) / (screenPoints[j].y - screenPoints[i].y) + screenPoints[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }, [gridToScreen]);

  // Find element at point for erasing
  const findElementAtPoint = useCallback((point: Point) => {
    // Check text labels first (smaller target, should be checked first)
    for (const label of textLabels) {
      const screenPos = gridToScreen(label.position);
      const distance = Math.sqrt(
        Math.pow(point.x - screenPos.x, 2) + 
        Math.pow(point.y - screenPos.y, 2)
      );
      if (distance < 30) {
        return { type: 'text', id: label.id, element: label };
      }
    }
    
    // Check rooms
    for (const room of rooms) {
      if (isPointInRoom(point, room)) {
        return { type: 'room', id: room.id, element: room };
      }
    }
    
    // Check freehand paths
    for (const path of freehandPaths) {
      for (const pathPoint of path.points) {
        const screenPoint = gridToScreen(pathPoint);
        const distance = Math.sqrt(
          Math.pow(point.x - screenPoint.x, 2) + 
          Math.pow(point.y - screenPoint.y, 2)
        );
        if (distance < 10) {
          return { type: 'freehand', id: path.id, element: path };
        }
      }
    }
    
    return null;
  }, [rooms, freehandPaths, textLabels, isPointInRoom, gridToScreen]);

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
    
    // Draw grid with dynamic scaling
    const gridConfig = getGridConfig(zoom);
    const majorScale = scale * gridConfig.majorInterval;
    const minorScale = scale * gridConfig.minorInterval;
    
    // Draw minor grid lines
    if (gridConfig.showMinor && gridConfig.minorInterval !== gridConfig.majorInterval) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 0.5;
      
      // Vertical minor lines
      for (let x = viewOffset.x % minorScale; x < width; x += minorScale) {
        // Skip if this is a major line
        const gridX = Math.round((x - viewOffset.x) / scale);
        if (gridX % gridConfig.majorInterval !== 0) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
      
      // Horizontal minor lines
      for (let y = viewOffset.y % minorScale; y < height; y += minorScale) {
        // Skip if this is a major line
        const gridY = Math.round((y - viewOffset.y) / scale);
        if (gridY % gridConfig.majorInterval !== 0) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
    }
    
    // Draw major grid lines (dark)
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    
    // Vertical major lines
    for (let x = viewOffset.x % majorScale; x < width; x += majorScale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal major lines
    for (let y = viewOffset.y % majorScale; y < height; y += majorScale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw grid labels (only for major lines)
    ctx.fillStyle = '#666666';
    ctx.font = `${Math.max(8, Math.min(12, zoom / 10))}px Arial`;
    ctx.textAlign = 'center';
    
    // X-axis labels (major intervals only)
    for (let i = 0; i < width / majorScale + 2; i++) {
      const x = (viewOffset.x % majorScale) + i * majorScale;
      const gridX = Math.round((x - viewOffset.x) / scale);
      if (gridX >= 0 && x > 20 && x < width - 20) {
        ctx.fillText(`${gridX}ft`, x, 15);
      }
    }
    
    // Y-axis labels (major intervals only)
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < height / majorScale + 2; i++) {
      const y = (viewOffset.y % majorScale) + i * majorScale;
      const gridY = Math.round((y - viewOffset.y) / scale);
      if (gridY >= 0 && y > 25 && y < height - 15) {
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
      
      // Draw room measurements (always on mobile; desktop for rectangles or selected rooms)
      {
        const isRectangle = room.points.length === 4 && checkIfRectangle(room.points);
        const shouldShowMeasurements = isMobile || room.selected || isRectangle;
        
        if (shouldShowMeasurements) {
          // Calculate width and height robustly from bounding box
          const xs = room.points.map(p => p.x);
          const ys = room.points.map(p => p.y);
          const width = Math.abs(Math.max(...xs) - Math.min(...xs));
          const height = Math.abs(Math.max(...ys) - Math.min(...ys));
          
          if (width > 0 && height > 0) {
            // Draw dimensions on the room
            const centerX = screenPoints.reduce((sum, p) => sum + p.x, 0) / screenPoints.length;
            const centerY = screenPoints.reduce((sum, p) => sum + p.y, 0) / screenPoints.length;
            
            // Ensure minimum readable font size for mobile
            const fontSize = Math.max(14, Math.min(18, zoom / 6));
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add semi-transparent background for better readability
            const dimensionText = `${width}×${height} ft`;
            const textMetrics = ctx.measureText(dimensionText);
            const padding = Math.max(6, fontSize * 0.3); // Scale padding with font size
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
              centerX - textMetrics.width / 2 - padding,
              centerY - fontSize / 2 - padding / 2,
              textMetrics.width + padding * 2,
              fontSize + padding
            );
            
            ctx.fillStyle = '#000000';
            ctx.fillText(dimensionText, centerX, centerY);
          }
        }
      }
    });
    
    // Draw freehand paths
    freehandPaths.forEach(path => {
      if (path.points.length < 2) return;
      const screenPoints = path.points.map(gridToScreen);
      
      ctx.strokeStyle = path.color.replace('40', '');
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      screenPoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    
    // Draw text labels with selection highlight
    textLabels.forEach(label => {
      const screenPos = gridToScreen(label.position);
      
      // Highlight if being dragged
      if (isDraggingText && isDraggingText.id === label.id) {
        ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
        ctx.fillRect(screenPos.x - 5, screenPos.y - label.fontSize - 5, 
                     ctx.measureText(label.text).width + 10, label.fontSize + 10);
      }
      
      ctx.fillStyle = label.color;
      ctx.font = `${label.fontSize}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(label.text, screenPos.x, screenPos.y);
    });
    
    // Draw current room being created
    if (tool === 'room' && currentRoom.length > 0) {
      const screenPoints = currentRoom.map(gridToScreen);
      
      if (mousePos && !isRoomClosed) {
        const gridPos = screenToGrid(mousePos);
        screenPoints.push(gridToScreen(gridPos));
      }
      
      if (screenPoints.length > 1) {
        ctx.strokeStyle = selectedColor.replace('40', '');
        ctx.fillStyle = selectedColor;
        ctx.lineWidth = 2;
        
        // Show solid lines if room is closed, dashed if still being created
        if (isRoomClosed) {
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([5, 5]);
        }
        
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        screenPoints.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        
        // Close the path if room is closed or has enough points
        if (isRoomClosed || screenPoints.length > 2) {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw vertices with first point in green, others in black (draw first point last to ensure visibility)
      if (currentRoom.length > 0) {
        // Draw all non-first points in black
        for (let i = 1; i < currentRoom.length; i++) {
          const p = gridToScreen(currentRoom[i]);
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Draw the very first point last, in green, so it stays on top
        const first = gridToScreen(currentRoom[0]);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(first.x, first.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw current freehand path with preview straightening
    if (tool === 'freehand' && currentPath.length > 1) {
      // Show preview of straightened line
      const previewPath = mousePos ? straightenLine([...currentPath, screenToGrid(mousePos)]) : currentPath;
      const screenPoints = previewPath.map(gridToScreen);
      
      ctx.strokeStyle = selectedColor.replace('40', '');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (screenPoints.length === 2 && previewPath.length === 2) {
        // Show straight line preview with dashed line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = selectedColor.replace('40', '80'); // More opaque for preview
      }
      
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      screenPoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }
  }, [rooms, freehandPaths, textLabels, currentRoom, currentPath, mousePos, tool, selectedColor, zoom, viewOffset, gridToScreen, screenToGrid]);
  
  // Get point from mouse or touch event
  const getEventPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);

  // Get distance between two touches
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Handle mouse/touch start
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // Handle pinch zoom - prioritize over freehand drawing
    if ('touches' in e && e.touches.length === 2) {
      setIsPinching(true);
      const distance = getTouchDistance(e.touches);
      setLastPinchDistance(distance);
      setLastPinchZoom(zoom);
      return;
    }
    
    // Don't allow drawing during pinch
    if (isPinching) return;
    
    const point = getEventPoint(e);
    const gridPos = screenToGrid(point);
    const currentTime = Date.now();
    
    // Check for double-click on text labels
    const clickedElement = findElementAtPoint(point);
    if (clickedElement && clickedElement.type === 'text') {
      const isDoubleClick = currentTime - lastClickTime < 300 && lastClickedText === clickedElement.id;
      
      if (isDoubleClick) {
        // Double-click: Edit or delete text
        const textLabel = clickedElement.element as TextLabel;
        setTextInput({
          position: textLabel.position,
          value: textLabel.text,
          isEditing: true,
          editingId: textLabel.id
        });
        setLastClickTime(0);
        setLastClickedText(null);
        return;
      } else {
        // Single click: Start dragging
        const textLabel = clickedElement.element as TextLabel;
        const screenPos = gridToScreen(textLabel.position);
        setIsDraggingText({
          id: textLabel.id,
          offset: { x: point.x - screenPos.x, y: point.y - screenPos.y }
        });
        setLastClickTime(currentTime);
        setLastClickedText(clickedElement.id);
        return;
      }
    }
    
    // Reset double-click tracking if clicking elsewhere
    setLastClickTime(currentTime);
    setLastClickedText(null);
    
    if (tool === 'room') {
      console.log('Room tool clicked, currentRoom length:', currentRoom.length);
      
      // Check if clicking near first point to close room
      if (currentRoom.length >= 3) {
        const firstScreenPoint = gridToScreen(currentRoom[0]);
        const distance = Math.sqrt(
          Math.pow(point.x - firstScreenPoint.x, 2) + 
          Math.pow(point.y - firstScreenPoint.y, 2)
        );
        
        console.log('Distance to first point:', distance);
        
        if (distance < 30) { // Increased touch target for mobile
          // Close room (seal it) but don't complete yet - show Done button
          console.log('Room closed/sealed, showing Done button');
          setIsRoomClosed(true);
          return;
        }
      }
      
      // Add point
      console.log('Adding point to room:', gridPos);
      setCurrentRoom(prev => {
        const newRoom = [...prev, gridPos];
        console.log('New currentRoom state:', newRoom);
        return newRoom;
      });
    } else if (tool === 'freehand' && !isPinching) {
      setIsDrawing(true);
      setCurrentPath([gridPos]);
    } else if (tool === 'label') {
      setTextInput({ position: gridPos, value: '', isEditing: true });
    } else if (tool === 'erase') {
      const element = findElementAtPoint(point);
      if (element) {
        if (element.type === 'room') {
          setRooms(prev => prev.filter(room => room.id !== element.id));
        } else if (element.type === 'freehand') {
          setFreehandPaths(prev => prev.filter(path => path.id !== element.id));
        } else if (element.type === 'text') {
          setTextLabels(prev => prev.filter(label => label.id !== element.id));
        }
      }
    }
  }, [tool, currentRoom, rooms, screenToGrid, gridToScreen, calculateArea, selectedColor, onRoomsChange, findElementAtPoint, getEventPoint, getTouchDistance, zoom, lastClickTime, lastClickedText]);
  
  // Straighten line if it's approximately straight
  const straightenLine = useCallback((points: Point[]): Point[] => {
    if (points.length < 2) return points;
    
    const start = points[0];
    const end = points[points.length - 1];
    
    // Calculate the straight-line distance and actual path distance
    const straightDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    if (straightDistance < 3) return points; // Too short to straighten
    
    // Calculate angle
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const angleDegrees = (angle * 180 / Math.PI + 360) % 360;
    
    // Check if it's close to horizontal, vertical, or 45-degree angles
    const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    const snapThreshold = 15; // degrees
    
    for (const snapAngle of snapAngles) {
      const angleDiff = Math.min(
        Math.abs(angleDegrees - snapAngle),
        Math.abs(angleDegrees - snapAngle - 360),
        Math.abs(angleDegrees - snapAngle + 360)
      );
      
      if (angleDiff <= snapThreshold) {
        // Snap to this angle
        const snapRadians = (snapAngle * Math.PI) / 180;
        const snappedEnd = {
          x: start.x + straightDistance * Math.cos(snapRadians),
          y: start.y + straightDistance * Math.sin(snapRadians)
        };
        return [start, snappedEnd];
      }
    }
    
    return points;
  }, []);

  // Handle mouse/touch move
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // Handle text dragging
    if (isDraggingText) {
      const point = getEventPoint(e);
      const newGridPos = screenToGrid({
        x: point.x - isDraggingText.offset.x,
        y: point.y - isDraggingText.offset.y
      });
      
      setTextLabels(prev => prev.map(label => 
        label.id === isDraggingText.id 
          ? { ...label, position: newGridPos }
          : label
      ));
      return;
    }
    
    // Handle pinch zoom
    if ('touches' in e && e.touches.length === 2 && isPinching) {
      const distance = getTouchDistance(e.touches);
      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;
        const newZoom = Math.max(50, Math.min(500, lastPinchZoom * scale));
        if (Math.abs(newZoom - zoom) > 5) { // Only update if significant change
          onZoomChange?.(newZoom);
          setLastPinchZoom(newZoom);
        }
      }
      return;
    }
    
    const point = getEventPoint(e);
    setMousePos(point);
    const gridPos = screenToGrid(point);
    onCoordinateChange?.(gridPos);
    
    if (tool === 'freehand' && isDrawing && !isPinching) {
      setCurrentPath(prev => {
        // Throttle points for better performance on mobile
        if (prev.length > 0) {
          const lastPoint = prev[prev.length - 1];
          const lastScreenPoint = gridToScreen(lastPoint);
          const distance = Math.sqrt(
            Math.pow(point.x - lastScreenPoint.x, 2) + 
            Math.pow(point.y - lastScreenPoint.y, 2)
          );
          // Only add point if moved enough distance (smoother lines on mobile)
          if (distance < 5) return prev;
        }
        return [...prev, gridPos];
      });
    }
  }, [isDraggingText, getEventPoint, screenToGrid, onCoordinateChange, tool, isDrawing, gridToScreen, isPinching, getTouchDistance, lastPinchDistance, lastPinchZoom, zoom, onZoomChange]);
  
  // Handle mouse/touch end
  const handlePointerUp = useCallback(() => {
    // End text dragging
    if (isDraggingText) {
      setIsDraggingText(null);
      return;
    }
    
    if (isPinching) {
      setIsPinching(false);
      setLastPinchDistance(0);
      return;
    }
    
    if (tool === 'freehand' && isDrawing && currentPath.length > 1) {
      // Apply line straightening
      const straightenedPath = straightenLine(currentPath);
      
      const newPath: FreehandPath = {
        id: Date.now().toString(),
        points: straightenedPath,
        color: selectedColor,
        width: 3
      };
      setFreehandPaths(prev => [...prev, newPath]);
      setCurrentPath([]);
      setActionHistory(prev => [...prev, { type: 'freehand', data: newPath }]);
    }
    setIsDrawing(false);
  }, [isDraggingText, tool, isDrawing, currentPath, selectedColor, straightenLine, isPinching]);

  // Handle room completion
  const handleRoomComplete = useCallback(() => {
    if (currentRoom.length < 3 || !isRoomClosed) return;
    
    console.log('Room completed via Done button, clearing currentRoom state');
    const area = calculateArea(currentRoom);
    const newRoom: Room = {
      id: Date.now().toString(),
      points: [...currentRoom],
      label: '',
      area: area,
      color: selectedColor,
    };
    const newRooms = [...rooms, newRoom];
    setRooms(newRooms);
    onRoomsChange?.(newRooms);
    setCurrentRoom([]); // Clear the current room and reset first point
    setIsRoomClosed(false); // Reset closed state
    
    // Add to history
    setActionHistory(prev => [...prev, { type: 'room', data: newRoom }]);
    console.log('Room completed and currentRoom cleared via Done button');
  }, [currentRoom, isRoomClosed, calculateArea, selectedColor, rooms, onRoomsChange]);

  // Handle text input
  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    
    if (textInput.editingId) {
      // Update existing text label
      setTextLabels(prev => prev.map(label => 
        label.id === textInput.editingId 
          ? { ...label, text: textInput.value }
          : label
      ));
    } else {
      // Create new text label
      const newLabel: TextLabel = {
        id: Date.now().toString(),
        position: textInput.position,
        text: textInput.value,
        color: selectedColor.replace('40', ''),
        fontSize: 16
      };
      
      setTextLabels(prev => [...prev, newLabel]);
      setActionHistory(prev => [...prev, { type: 'text', data: newLabel }]);
    }
    
    setTextInput(null);
  }, [textInput, selectedColor]);

  // Handle text deletion
  const handleTextDelete = useCallback(() => {
    if (textInput && textInput.editingId) {
      setTextLabels(prev => prev.filter(label => label.id !== textInput.editingId));
      setTextInput(null);
    }
  }, [textInput]);

  // Setup canvas size
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
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

  // Expose functions to parent
  useEffect(() => {
    if (window) {
      (window as any).roomCanvasUndo = handleUndo;
      (window as any).roomCanvasExport = handleExport;
      (window as any).roomCanvasClear = handleClear;
      (window as any).roomCanvasPan = handlePanCanvas;
    }
  }, [handleUndo, handleExport, handleClear, handlePanCanvas]);

  
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-white relative">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair w-full h-full block touch-none"
        style={{ touchAction: 'none' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseLeave={() => {
          setMousePos(null);
          onCoordinateChange?.(null);
          setIsDrawing(false);
        }}
        onTouchCancel={() => {
          setMousePos(null);
          onCoordinateChange?.(null);
          setIsDrawing(false);
        }}
      />
      
      {/* Text Input */}
      {textInput && textInput.isEditing && (
        <div 
          className="absolute bg-white border border-gray-300 rounded shadow-lg p-2 z-10"
          style={{
            left: gridToScreen(textInput.position).x,
            top: gridToScreen(textInput.position).y - 40
          }}
        >
          <div className="flex items-center gap-2">
            <Input
              value={textInput.value}
              onChange={(e) => setTextInput(prev => prev ? {...prev, value: e.target.value} : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInput(null);
                if (e.key === 'Delete' && textInput.editingId) handleTextDelete();
              }}
              placeholder={textInput.editingId ? "Edit text..." : "Enter text..."}
              className="w-32 h-8 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleTextSubmit}>
              <Check className="h-4 w-4" />
            </Button>
            {textInput.editingId && (
              <Button size="sm" variant="ghost" onClick={handleTextDelete} className="text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
              </Button>
            )}
            {!textInput.editingId && (
              <Button size="sm" variant="ghost" onClick={() => setTextInput(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Done Button for Room Creation - Only show when room is closed/sealed */}
      {tool === 'room' && currentRoom.length >= 3 && isRoomClosed && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={handleRoomComplete}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg shadow-lg"
          >
            Done
          </Button>
        </div>
      )}
      
      {/* Tool Instructions - Show for 5 seconds only */}
      {showTooltip && (
        <>
          {tool === 'room' && currentRoom.length > 0 && !isRoomClosed && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                {currentRoom.length >= 3 ? 'Click first point to close room' : `${3 - currentRoom.length} more points needed`}
              </p>
            </div>
          )}
          
          {tool === 'room' && isRoomClosed && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Room is sealed - Click Done to complete
              </p>
            </div>
          )}
          
          {tool === 'freehand' && (
            <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Click and drag to draw freehand lines
              </p>
            </div>
          )}
          
          {tool === 'label' && (
            <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Click anywhere to add text
              </p>
            </div>
          )}
          
          {tool === 'erase' && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Click on any element to erase it
              </p>
            </div>
          )}
          
          {tool === 'room' && currentRoom.length === 0 && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Click to create room points. Create square/rectangular rooms to see dimensions.
              </p>
            </div>
          )}
          
          {tool === 'select' && (
            <div className="absolute top-4 right-4 bg-gray-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">
                Click to select and move elements
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Mobile Position Slider */}
      {isMobile && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
          <div className="text-xs text-gray-600 mb-2 text-center">Adjust Drawing Position</div>
          <Slider
            value={[mobileSliderValue]}
            onValueChange={(value) => setMobileSliderValue(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};