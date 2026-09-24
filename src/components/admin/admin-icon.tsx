import {
  BookOpen,
  FlaskConical,
  HeartPulse,
  History,
  Inbox,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
  type LucideProps,
} from "lucide-react";

import type { AdminSection } from "@/config/admin-sections";

const ICONS = { Inbox, Zap, Workflow, ScrollText, HeartPulse, ShieldCheck, BookOpen, Users, MessageSquare, History, FlaskConical } satisfies Record<
  AdminSection["icon"],
  React.ComponentType<LucideProps>
>;

export function AdminIcon({ name, ...props }: { name: AdminSection["icon"] } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden strokeWidth={1.75} {...props} />;
}
