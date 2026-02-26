import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Valor de 0 a 100 */
  value?: number;
  /** Clases adicionales para el contenedor */
  className?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-muted",
      "dark:bg-muted/50",
      className
    )}
    value={Math.min(100, Math.max(0, value))}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out dark:bg-primary"
      style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
