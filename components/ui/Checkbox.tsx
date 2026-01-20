"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", ...props }, ref) => {
    if (label) {
      return (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
            {...props}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        </label>
      );
    }

    return (
      <input
        ref={ref}
        type="checkbox"
        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";