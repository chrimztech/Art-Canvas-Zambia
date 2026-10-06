import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-medium cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,rgba(243,214,133,1),rgba(201,168,76,1))] text-primary-foreground shadow-[0_16px_30px_rgba(0,0,0,0.26)] hover:-translate-y-0.5 hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_14px_26px_rgba(0,0,0,0.2)] hover:brightness-105",
        outline:
          "border-border/80 bg-card/70 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm hover:border-primary/35 hover:bg-card hover:text-primary",
        secondary:
          "border-border/60 bg-secondary/80 text-secondary-foreground shadow-[0_12px_24px_rgba(0,0,0,0.16)] hover:bg-secondary",
        ghost:
          "border-transparent bg-transparent text-foreground/80 hover:border-border/70 hover:bg-secondary/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-11 px-8 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
