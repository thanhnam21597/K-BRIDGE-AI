"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, MessageCircle, Languages, SmilePlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ChatMessage, DynamicChecklistTask } from "@/lib/types";

type OnboardingKpiPanelProps = {
  userId: string;
};

type ChecklistSnapshot = {
  tasks: DynamicChecklistTask[];
  completed: string[];
};

type SelfRating = {
  before: number;
  after: number;
};

function checklistStorageKey(userId: string) {
  return `kbridge_dynamic_checklist_${userId}`;
}

function chatStorageKey(userId: string) {
  return `kbridge_chat_history_${userId}`;
}

function translationUsageKey(userId: string) {
  return `kbridge_translate_usage_${userId}`;
}

function selfRatingStorageKey(userId: string) {
  return `kbridge_self_rating_${userId}`;
}

export function OnboardingKpiPanel({ userId }: OnboardingKpiPanelProps) {
  const [checklist, setChecklist] = useState<ChecklistSnapshot>({ tasks: [], completed: [] });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [translationCount, setTranslationCount] = useState(0);
  const [selfRating, setSelfRating] = useState<SelfRating>({ before: 5, after: 7 });

  useEffect(() => {
    const loadMetrics = () => {
      try {
        const checklistRaw = localStorage.getItem(checklistStorageKey(userId));
        const checklistParsed = checklistRaw
          ? (JSON.parse(checklistRaw) as ChecklistSnapshot)
          : { tasks: [], completed: [] };
        setChecklist({
          tasks: Array.isArray(checklistParsed.tasks) ? checklistParsed.tasks : [],
          completed: Array.isArray(checklistParsed.completed) ? checklistParsed.completed : [],
        });
      } catch {
        setChecklist({ tasks: [], completed: [] });
      }

      try {
        const chatRaw = localStorage.getItem(chatStorageKey(userId));
        const chatParsed = chatRaw ? (JSON.parse(chatRaw) as ChatMessage[]) : [];
        setChatMessages(Array.isArray(chatParsed) ? chatParsed : []);
      } catch {
        setChatMessages([]);
      }

      const translateRaw = Number(localStorage.getItem(translationUsageKey(userId)) ?? "0");
      setTranslationCount(Number.isFinite(translateRaw) ? translateRaw : 0);

      try {
        const ratingRaw = localStorage.getItem(selfRatingStorageKey(userId));
        const parsed = ratingRaw ? (JSON.parse(ratingRaw) as SelfRating) : { before: 5, after: 7 };
        setSelfRating({
          before: Math.min(10, Math.max(1, Number(parsed.before ?? 5))),
          after: Math.min(10, Math.max(1, Number(parsed.after ?? 7))),
        });
      } catch {
        setSelfRating({ before: 5, after: 7 });
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 1500);
    return () => clearInterval(interval);
  }, [userId]);

  function onSelfRatingChange(key: "before" | "after", value: string) {
    const parsed = Number(value || 0);
    const normalized = Math.min(10, Math.max(1, parsed || 1));
    setSelfRating((previous) => {
      const next = { ...previous, [key]: normalized };
      localStorage.setItem(selfRatingStorageKey(userId), JSON.stringify(next));
      return next;
    });
  }

  const week1Completion = useMemo(() => {
    const week1Tasks = checklist.tasks.filter((task) => task.day >= 1 && task.day <= 7);
    if (week1Tasks.length === 0) return 0;
    const completedSet = new Set(checklist.completed);
    const doneCount = week1Tasks.filter((task) => completedSet.has(task.id)).length;
    return Math.round((doneCount / week1Tasks.length) * 100);
  }, [checklist.completed, checklist.tasks]);

  const resolvedQuestions = useMemo(() => {
    let resolved = 0;
    for (let index = 0; index < chatMessages.length; index += 1) {
      if (chatMessages[index].role !== "user") continue;
      const hasAssistantReply = chatMessages
        .slice(index + 1)
        .some((message) => message.role === "assistant");
      if (hasAssistantReply) resolved += 1;
    }
    return resolved;
  }, [chatMessages]);

  const confidenceDelta = selfRating.after - selfRating.before;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-blue-600" />
          Onboarding KPI Dashboard
        </CardTitle>
        <CardDescription>
          Dinh luong hieu qua onboarding theo tien do, chat support, translate usage, va confidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">% task hoan thanh tuan 1</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{week1Completion}%</p>
            <Progress value={week1Completion} className="mt-2" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <MessageCircle className="size-3.5" />
              So cau hoi chatbot da giai quyet
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{resolvedQuestions}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Languages className="size-3.5" />
              So lan dung dich thuat
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{translationCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <SmilePlus className="size-3.5" />
              Muc tu tin (truoc/sau)
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">
              {selfRating.before}
              {" -> "}
              {selfRating.after}
            </p>
            <p className="text-xs text-slate-600">
              Delta: <span className={confidenceDelta >= 0 ? "text-emerald-600" : "text-rose-600"}>{confidenceDelta >= 0 ? "+" : ""}{confidenceDelta}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-medium text-blue-800">Self-rating (1-10)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-blue-700">
              Before onboarding
              <Input
                type="number"
                min={1}
                max={10}
                value={selfRating.before}
                onChange={(event) => onSelfRatingChange("before", event.target.value)}
                className="mt-1 bg-white"
              />
            </label>
            <label className="text-xs text-blue-700">
              After onboarding
              <Input
                type="number"
                min={1}
                max={10}
                value={selfRating.after}
                onChange={(event) => onSelfRatingChange("after", event.target.value)}
                className="mt-1 bg-white"
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
