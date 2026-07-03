"use client";

import { SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id ?? props.name} className="text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id ?? props.name}
        className={cn(
          "w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-900",
          "placeholder:text-navy-300 transition-all duration-150 min-h-24",
          "focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent",
          error && "border-rose-400 focus:ring-rose-300",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id ?? props.name} className="text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id ?? props.name}
        className={cn(
          "w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-900",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent",
          error && "border-rose-400 focus:ring-rose-300",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
