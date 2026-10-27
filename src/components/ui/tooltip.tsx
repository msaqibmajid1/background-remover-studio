import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
  {
    variants: {
      animation: {
        default: "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        fade: "animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        scale: "animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95",
        slide: "data-[side=bottom]:animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:animate-in data-[side=left]:slide-in-from-right-2 data-[side=right]:animate-in data-[side=right]:slide-in-from-left-2 data-[side=top]:animate-in data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        bounce: "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:animate-bounce",
        none: "",
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      animation: "default",
      radius: "default",
    },
  }
);

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  showArrow?: boolean;
  arrowClassName?: string;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, animation, radius, showArrow = false, arrowClassName, children, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      tooltipContentVariants({ animation, radius }),
      // Slide direction based on side
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  >
    {children}
    {showArrow && (
      <TooltipPrimitive.Arrow 
        className={cn(
          "fill-popover drop-shadow-sm",
          arrowClassName
        )} 
        width={10} 
        height={5} 
      />
    )}
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider,
  tooltipContentVariants
};
