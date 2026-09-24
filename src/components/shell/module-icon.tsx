import {
  CalendarClock,
  Laptop,
  MessageCircleQuestion,
  Plane,
  Route,
  ScrollText,
  Settings,
  Sprout,
  type LucideProps,
} from "lucide-react";

import type { ModuleIconName } from "@/config/modules";

const ICONS = {
  Route,
  MessageCircleQuestion,
  ScrollText,
  Laptop,
  Plane,
  CalendarClock,
  Sprout,
  Settings,
} satisfies Record<ModuleIconName, React.ComponentType<LucideProps>>;

export function ModuleIcon({ name, ...props }: { name: ModuleIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden strokeWidth={1.75} {...props} />;
}
