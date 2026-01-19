"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: "primary" | "secondary" | "danger" | "ghost" | "default" | "outline";
  readonly size?: "sm" | "md" | "lg" | "icon" | "none";
  readonly loading?: boolean;
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md";
    
    const variants = {
      primary: "bg-foreground text-background hover:bg-foreground/90",
      default: "bg-foreground text-background hover:bg-foreground/90",
      secondary: "border border-border bg-card hover:bg-foreground/5 hover:border-foreground/20",
      danger: "bg-red-600 text-white hover:bg-red-700",
      ghost: "text-foreground hover:bg-foreground/5",
      outline: "text-foreground border border-border bg-transparent hover:bg-foreground/5",
    };
    
    const sizes = {
      sm: "h-7 px-2 text-[10px]",
      md: "h-9 px-4",
      lg: "h-11 px-6",
      icon: "h-9 w-9 p-0",
      none: "",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
