import * as icons from "lucide-react-native";
import { HelpCircle, LucideProps } from "lucide-react-native";

export function DynamicIcon({
  name,
  ...props
}: { name?: string | null } & LucideProps) {
  const IconComponent =
    (name && (icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name]) ||
    HelpCircle;
  return <IconComponent {...props} />;
}
