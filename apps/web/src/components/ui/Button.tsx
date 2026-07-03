"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary:
    "bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-500 shadow-sm hover:shadow-md",
  secondary:
    "bg-bpom-600 text-white hover:bg-bpom-700 focus-visible:ring-bpom-400 shadow-sm hover:shadow-md",
  outline:
    "border border-navy-200 text-navy-900 hover:bg-navy-50 focus-visible:ring-navy-300",
  ghost: "text-navy-700 hover:bg-navy-50 focus-visible:ring-navy-200",
  danger: "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-300",
};

const sizes: Record<string, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-6 py-3.5 rounded-2xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
