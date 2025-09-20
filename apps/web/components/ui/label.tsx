import * as React from "react";

import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium text-slate-600 dark:text-slate-300", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
