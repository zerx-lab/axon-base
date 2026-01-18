"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] uppercase tracking-widest text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full border border-border bg-card px-3 py-2 font-mono text-sm placeholder:text-muted/50 focus:border-foreground focus:outline-none ${
            error ? "border-red-500" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="font-mono text-[10px] text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
