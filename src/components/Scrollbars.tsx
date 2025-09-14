import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface ScrollbarProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function GreySlider({ value, min, max, onChange, orientation = "horizontal", className }: ScrollbarProps) {
  const rootCls = cn(
    "relative flex touch-none select-none",
    orientation === "horizontal" ? "w-full items-center h-4" : "h-full w-4 items-center flex-col",
    className,
  );

  const trackCls = cn(
    "relative overflow-hidden rounded-full bg-gray-200",
    orientation === "horizontal" ? "h-2 w-full" : "w-2 h-full",
  );

  const rangeCls = "absolute bg-gray-400";
  const thumbCls = "block h-4 w-4 rounded-full border-2 border-gray-400 bg-white shadow-sm hover:border-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300";

  return (
    <SliderPrimitive.Root
      value={[value]}
      min={min}
      max={max}
      onValueChange={(v) => onChange(v[0])}
      orientation={orientation}
      className={rootCls}
      aria-label={orientation === "horizontal" ? "Horizontal scrollbar" : "Vertical scrollbar"}
    >
      <SliderPrimitive.Track className={trackCls}>
        <SliderPrimitive.Range className={cn(rangeCls, orientation === "horizontal" ? "h-full" : "w-full")} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={thumbCls} />
    </SliderPrimitive.Root>
  );
}

export function HorizontalScrollbar(props: Omit<ScrollbarProps, "orientation">) {
  return <GreySlider {...props} orientation="horizontal" />;
}

export function VerticalScrollbar(props: Omit<ScrollbarProps, "orientation">) {
  return <GreySlider {...props} orientation="vertical" />;
}
