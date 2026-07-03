import * as icons from "lucide-react";
import { HelpCircle } from "lucide-react";

export function DynamicIcon({ name, className }: { name?: string | null; className?: string }) {
  const IconComponent = (name && (icons as unknown as Record<string, icons.LucideIcon>)[name]) || HelpCircle;
  return <IconComponent className={className} />;
}
