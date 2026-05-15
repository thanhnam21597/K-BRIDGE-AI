"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Download, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { DynamicChecklistTask } from "@/lib/types";

type WeeklyTimelinePanelProps = {
  userId: string;
};

type ChecklistSnapshot = {
  position: string;
  company: string;
  startDate: string;
  tasks: DynamicChecklistTask[];
  completed: string[];
};

type WeekRange = {
  id: string;
  label: string;
  fromDay: number;
  toDay: number;
};

const WEEK_RANGES: WeekRange[] = [
  { id: "week-1", label: "Week 1", fromDay: 1, toDay: 7 },
  { id: "week-2", label: "Week 2", fromDay: 8, toDay: 14 },
  { id: "week-3", label: "Week 3", fromDay: 15, toDay: 21 },
  { id: "week-4", label: "Week 4", fromDay: 22, toDay: 28 },
  { id: "week-5", label: "Wrap-up", fromDay: 29, toDay: 30 },
];

const REVIEW_PROMPTS = [
  "Tuan nay ban da lam tot dieu gi?",
  "Diem nao van con blocker can escalate?",
  "Tuan toi ban uu tien 2 muc tieu nao?",
];

function buildChecklistStorageKey(userId: string) {
  return `kbridge_dynamic_checklist_${userId}`;
}

function buildReviewStorageKey(userId: string) {
  return `kbridge_weekly_review_notes_${userId}`;
}

export function WeeklyTimelinePanel({ userId }: WeeklyTimelinePanelProps) {
  const [snapshot, setSnapshot] = useState<ChecklistSnapshot | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadChecklistSnapshot = () => {
      const raw = localStorage.getItem(buildChecklistStorageKey(userId));
      if (!raw) {
        setSnapshot(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as ChecklistSnapshot;
        setSnapshot(parsed);
      } catch {
        setSnapshot(null);
      }
    };

    loadChecklistSnapshot();
    const interval = setInterval(loadChecklistSnapshot, 1800);
    const onStorage = (event: StorageEvent) => {
      if (event.key === buildChecklistStorageKey(userId)) {
        loadChecklistSnapshot();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  useEffect(() => {
    const raw = localStorage.getItem(buildReviewStorageKey(userId));
    if (!raw) {
      setReviewNotes({});
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      setReviewNotes(parsed);
    } catch {
      setReviewNotes({});
    }
  }, [userId]);

  function onReviewNoteChange(weekId: string, value: string) {
    setReviewNotes((previous) => {
      const next = { ...previous, [weekId]: value };
      localStorage.setItem(buildReviewStorageKey(userId), JSON.stringify(next));
      return next;
    });
  }

  const weeklyData = useMemo(() => {
    if (!snapshot || !Array.isArray(snapshot.tasks)) return [];
    const completedSet = new Set(snapshot.completed ?? []);

    return WEEK_RANGES.map((week) => {
      const weekTasks = snapshot.tasks.filter(
        (task) => task.day >= week.fromDay && task.day <= week.toDay,
      );
      const completedTasks = weekTasks.filter((task) => completedSet.has(task.id));
      const completionRate = weekTasks.length
        ? Math.round((completedTasks.length / weekTasks.length) * 100)
        : 0;
      const openGoals = weekTasks.filter((task) => !completedSet.has(task.id)).slice(0, 3);
      const weeklyCheckpoint = weekTasks.find((task) =>
        task.title.toLowerCase().includes("weekly checkpoint"),
      );
      const categoryCount = new Set(weekTasks.map((task) => task.category)).size;

      return {
        week,
        weekTasks,
        completedTasks,
        completionRate,
        openGoals,
        weeklyCheckpoint,
        checkpointDone: weeklyCheckpoint ? completedSet.has(weeklyCheckpoint.id) : false,
        categoryCount,
      };
    });
  }, [snapshot]);

  async function exportWeeklyReviewPdf(weekId: string) {
    if (!snapshot) return;
    const item = weeklyData.find((entry) => entry.week.id === weekId);
    if (!item) return;

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const maxWidth = 515;
    let y = 48;

    const addWrappedLine = (text: string, size = 10, gap = 16) => {
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 780) {
          pdf.addPage();
          y = 48;
        }
        pdf.text(line, marginX, y);
        y += gap;
      });
    };

    const today = new Date().toLocaleDateString("en-CA");
    const weeklyNote = reviewNotes[item.week.id]?.trim() || "No weekly note yet.";

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("K-Bridge AI - Weekly Review Report", marginX, y);
    y += 24;

    pdf.setFont("helvetica", "normal");
    addWrappedLine(`User: ${userId}`);
    addWrappedLine(`Position: ${snapshot.position}`);
    addWrappedLine(`Company: ${snapshot.company}`);
    addWrappedLine(`Start date: ${snapshot.startDate}`);
    addWrappedLine(`Week: ${item.week.label} (Day ${item.week.fromDay}-${item.week.toDay})`);
    addWrappedLine(`Export date: ${today}`);
    addWrappedLine(
      `Progress: ${item.completionRate}% (${item.completedTasks.length}/${item.weekTasks.length} tasks completed)`,
    );
    addWrappedLine(
      `Weekly checkpoint: ${
        item.weeklyCheckpoint
          ? item.checkpointDone
            ? "Completed"
            : "Pending"
          : "No weekly checkpoint in this range"
      }`,
    );
    y += 8;

    pdf.setFont("helvetica", "bold");
    addWrappedLine("Weekly Goals (Open Items)", 12, 18);
    pdf.setFont("helvetica", "normal");
    if (item.openGoals.length === 0) {
      addWrappedLine("- All weekly goals completed.");
    } else {
      item.openGoals.forEach((goal) => {
        addWrappedLine(`- Day ${goal.day}: ${goal.title}`);
      });
    }

    y += 8;
    pdf.setFont("helvetica", "bold");
    addWrappedLine("Weekly Review Prompts", 12, 18);
    pdf.setFont("helvetica", "normal");
    REVIEW_PROMPTS.forEach((prompt) => addWrappedLine(`- ${prompt}`));

    y += 8;
    pdf.setFont("helvetica", "bold");
    addWrappedLine("Your Weekly Note", 12, 18);
    pdf.setFont("helvetica", "normal");
    addWrappedLine(weeklyNote);

    const safeWeekId = item.week.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    pdf.save(`kbridge-weekly-review-${safeWeekId}-${today}.pdf`);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-4 text-blue-600" />
          Weekly Goals + Review
        </CardTitle>
        <CardDescription>
          Tong hop onboarding theo tung tuan de ban biet ro muc tieu, tien do, va diem can improve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!snapshot || snapshot.tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Chua co du lieu checklist. Hay generate checklist truoc, sau do quay lai day de xem timeline theo tuan.
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-2">
            <div className="space-y-3">
              {weeklyData.map((item) => (
                <div key={item.week.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.week.label} (Day {item.week.fromDay}-{item.week.toDay})
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.completedTasks.length}/{item.weekTasks.length} tasks done, {item.categoryCount} categories
                      </p>
                    </div>
                    <Badge variant={item.completionRate >= 70 ? "default" : "outline"}>
                      {item.completionRate}% complete
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-2 h-8 w-full text-xs sm:w-auto"
                    onClick={() => void exportWeeklyReviewPdf(item.week.id)}
                  >
                    <Download className="size-3.5" />
                    Export Weekly Review PDF
                  </Button>

                  <div className="mt-2">
                    <Progress value={item.completionRate} />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <ClipboardList className="size-3.5" />
                        Weekly goals (top open items)
                      </p>
                      {item.openGoals.length === 0 ? (
                        <p className="text-xs text-emerald-600">All weekly goals completed. Great consistency!</p>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-600">
                          {item.openGoals.map((goal) => (
                            <li key={goal.id}>
                              - Day {goal.day}: {goal.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <CheckCircle2 className="size-3.5" />
                        Weekly review
                      </p>
                      <p className="text-xs text-slate-600">
                        Checkpoint test:{" "}
                        {item.weeklyCheckpoint ? (
                          <span className={item.checkpointDone ? "text-emerald-600" : "text-amber-600"}>
                            {item.checkpointDone ? "Completed" : "Pending"}
                          </span>
                        ) : (
                          <span className="text-slate-500">No weekly checkpoint this range</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Review prompts: {REVIEW_PROMPTS.join(" | ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-slate-700">Your weekly note</p>
                    <Textarea
                      value={reviewNotes[item.week.id] ?? ""}
                      onChange={(event) => onReviewNoteChange(item.week.id, event.target.value)}
                      placeholder="Viet quick review: achievements, blockers, next-week plan..."
                      className="min-h-20 bg-white text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
