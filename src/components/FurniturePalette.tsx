import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bed, 
  Armchair, 
  ChefHat, 
  Tv, 
  Car,
  Bath,
  DoorOpen,
  Square,
  Circle,
  Refrigerator,
  UtensilsCrossed,
  Lamp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FurnitureItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  category: string;
  color: string;
  width: number; // in grid units (feet)
  height: number; // in grid units (feet)
  shape: 'rectangle' | 'circle';
}

const FURNITURE_ITEMS: FurnitureItem[] = [
  // Bedroom
  { id: 'bed-single', name: 'Single Bed', icon: Bed, category: 'Bedroom', color: '#8B4513', width: 3, height: 6, shape: 'rectangle' },
  { id: 'bed-double', name: 'Double Bed', icon: Bed, category: 'Bedroom', color: '#654321', width: 5, height: 6, shape: 'rectangle' },
  { id: 'bed-king', name: 'King Bed', icon: Bed, category: 'Bedroom', color: '#5D4037', width: 6, height: 7, shape: 'rectangle' },
  { id: 'wardrobe', name: 'Wardrobe', icon: Square, category: 'Bedroom', color: '#795548', width: 6, height: 2, shape: 'rectangle' },
  { id: 'nightstand', name: 'Nightstand', icon: Square, category: 'Bedroom', color: '#8D6E63', width: 2, height: 1, shape: 'rectangle' },
  
  // Living Room
  { id: 'sofa-2seat', name: '2-Seat Sofa', icon: Armchair, category: 'Living Room', color: '#607D8B', width: 5, height: 2, shape: 'rectangle' },
  { id: 'sofa-3seat', name: '3-Seat Sofa', icon: Armchair, category: 'Living Room', color: '#546E7A', width: 7, height: 2, shape: 'rectangle' },
  { id: 'armchair', name: 'Armchair', icon: Armchair, category: 'Living Room', color: '#78909C', width: 3, height: 2, shape: 'rectangle' },
  { id: 'coffee-table', name: 'Coffee Table', icon: Square, category: 'Living Room', color: '#A1887F', width: 3, height: 2, shape: 'rectangle' },
  { id: 'tv-stand', name: 'TV Stand', icon: Tv, category: 'Living Room', color: '#424242', width: 5, height: 1, shape: 'rectangle' },
  { id: 'side-table', name: 'Side Table', icon: Circle, category: 'Living Room', color: '#8D6E63', width: 1, height: 1, shape: 'circle' },
  
  // Kitchen
  { id: 'refrigerator', name: 'Refrigerator', icon: Refrigerator, category: 'Kitchen', color: '#ECEFF1', width: 2, height: 2, shape: 'rectangle' },
  { id: 'stove', name: 'Stove', icon: ChefHat, category: 'Kitchen', color: '#455A64', width: 2, height: 2, shape: 'rectangle' },
  { id: 'kitchen-island', name: 'Kitchen Island', icon: UtensilsCrossed, category: 'Kitchen', color: '#6D4C41', width: 6, height: 3, shape: 'rectangle' },
  { id: 'dining-table', name: 'Dining Table', icon: Square, category: 'Kitchen', color: '#8D6E63', width: 4, height: 6, shape: 'rectangle' },
  { id: 'dining-chair', name: 'Dining Chair', icon: Square, category: 'Kitchen', color: '#A1887F', width: 1, height: 1, shape: 'rectangle' },
  
  // Bathroom
  { id: 'bathtub', name: 'Bathtub', icon: Bath, category: 'Bathroom', color: '#FFFFFF', width: 5, height: 2, shape: 'rectangle' },
  { id: 'shower', name: 'Shower', icon: Square, category: 'Bathroom', color: '#F5F5F5', width: 3, height: 3, shape: 'rectangle' },
  { id: 'toilet', name: 'Toilet', icon: Circle, category: 'Bathroom', color: '#FFFFFF', width: 2, height: 2, shape: 'rectangle' },
  { id: 'sink', name: 'Sink', icon: Circle, category: 'Bathroom', color: '#F5F5F5', width: 2, height: 1, shape: 'rectangle' },
  
  // Other
  { id: 'door', name: 'Door', icon: DoorOpen, category: 'Other', color: '#8D6E63', width: 1, height: 3, shape: 'rectangle' },
  { id: 'window', name: 'Window', icon: Square, category: 'Other', color: '#E3F2FD', width: 3, height: 1, shape: 'rectangle' },
];

const CATEGORIES = ['Bedroom', 'Living Room', 'Kitchen', 'Bathroom', 'Other'];

interface FurniturePaletteProps {
  isVisible: boolean;
  onToggle: () => void;
  onFurnitureSelect: (furniture: FurnitureItem) => void;
  selectedFurniture: string | null;
}

export const FurniturePalette: React.FC<FurniturePaletteProps> = ({
  isVisible,
  onToggle,
  onFurnitureSelect,
  selectedFurniture
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string>('Living Room');

  const handleCategoryToggle = (category: string) => {
    setExpandedCategory(expandedCategory === category ? '' : category);
  };

  const getFurnitureByCategory = (category: string) => {
    return FURNITURE_ITEMS.filter(item => item.category === category);
  };

  return (
    <Card className={cn(
      "fixed right-4 top-20 bottom-4 w-80 bg-card border-border shadow-lg z-40 transition-transform duration-300",
      isVisible ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Furniture</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Drag furniture items onto your floor plan
          </p>
        </div>

        <div className="flex-1 overflow-auto">
          {CATEGORIES.map((category) => {
            const items = getFurnitureByCategory(category);
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="border-b border-border">
                <button
                  onClick={() => handleCategoryToggle(category)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-foreground">{category}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onFurnitureSelect(item)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all hover:shadow-md flex flex-col items-center gap-2 text-center",
                            selectedFurniture === item.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              ...item,
                              imageKey: item.id // Use the ID as the image key
                            }));
                            onFurnitureSelect(item);
                          }}
                        >
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: item.color + '20' }}
                          >
                            <item.icon 
                              className="h-5 w-5" 
                              style={{ color: item.color }}
                            />
                          </div>
                          <div className="text-xs font-medium text-foreground leading-tight">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.width}×{item.height} ft
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Click to select, drag to place</p>
            <p>• Drop on canvas to add furniture</p>
            <p>• Use handles to resize/rotate</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
