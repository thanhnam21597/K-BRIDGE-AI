"use client";

import type { ComponentType } from "react";
import {
  Bot,
  Languages,
  MessageSquareQuote,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FeatureKey, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: UserProfile;
  activeFeature: FeatureKey;
  onSelectFeature: (feature: FeatureKey) => void;
};

const NAV_ITEMS: {
  key: FeatureKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "cultural-coach", label: "Cultural Coach", icon: Bot },
  { key: "translator", label: "Real-time Translator", icon: Languages },
  { key: "role-play", label: "Role-play Simulator", icon: MessageSquareQuote },
  { key: "daily-tips", label: "Daily Tips", icon: Sparkles },
];

export function Sidebar({ user, activeFeature, onSelectFeature }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-w-72">
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-blue-600/95 px-3 py-3 text-white">
        <Avatar className="size-10 ring-2 ring-white/50">
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-blue-100">{user.role.toUpperCase()}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modules</p>
        <Badge variant="accent">
          <ClipboardCheck className="mr-1 size-3" />
          Day 1-30
        </Badge>
      </div>

      <div className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeFeature === item.key;
          return (
            <Button
              key={item.key}
              variant="ghost"
              className={cn(
                "h-10 w-full justify-start rounded-xl text-left",
                isActive && "bg-blue-50 text-blue-700",
              )}
              onClick={() => onSelectFeature(item.key)}
            >
              <Icon className="size-4" />
              {item.label}
            </Button>
          );
        })}
      </div>

      <Separator className="my-4" />

      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Korean teams often prefer structured updates. Keep your reports concise and respectful.
      </div>
    </aside>
  );
}
