"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChecklistCategory, DynamicChecklistTask } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChecklistPanelProps = {
  userId: string;
};

type ChecklistState = {
  position: string;
  company: string;
  startDate: string;
  tasks: DynamicChecklistTask[];
  completed: string[];
};

const DEFAULT_STATE: ChecklistState = {
  position: "Software Engineer",
  company: "Samsung",
  startDate: new Date().toISOString().slice(0, 10),
  tasks: [],
  completed: [],
};

const CATEGORY_OPTIONS: ChecklistCategory[] = [
  "First Week",
  "First Month",
  "Cultural Adaptation",
  "Technical Setup",
  "Relationship Building",
];

const POSITION_OPTIONS = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full-stack Engineer",
  "Mobile Engineer",
  "QA Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Data Analyst",
  "Data Scientist",
  "AI Engineer",
  "ML Engineer",
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "UI/UX Designer",
  "Graphic Designer",
  "Marketing Specialist",
  "Digital Marketing Specialist",
  "Content Creator",
  "Sales Executive",
  "Customer Success Specialist",
  "HR Specialist",
  "Recruiter",
  "Finance Analyst",
  "Accountant",
  "Operations Specialist",
  "Procurement Specialist",
  "Supply Chain Coordinator",
  "Administrative Assistant",
  "Executive Assistant",
  "Technical Support Specialist",
  "IT Helpdesk",
  "Security Analyst",
  "Legal Specialist",
  "Interpreter/Translator",
  "Teacher/Trainer",
  "Researcher",
  "Other",
] as const;

const COMPANY_OPTIONS = [
  "Samsung",
  "Kakao",
  "LG",
  "Hyundai",
  "Naver",
  "Coupang",
  "SK Hynix",
  "SK Telecom",
  "KT Corporation",
  "POSCO",
  "Lotte",
  "CJ Group",
  "Hanwha",
  "Doosan",
  "Kia",
  "Hyundai Mobis",
  "Shinsegae",
  "Nexon",
  "NCSoft",
  "Pearl Abyss",
  "Krafton",
  "Line Plus",
  "Woowa Brothers (Baemin)",
  "Yanolja",
  "Toss (Viva Republica)",
  "Kurly",
  "Musinsa",
  "Daangn",
  "Sendbird",
  "Moloco",
  "Other",
] as const;

const CULTURAL_TIPS_FOR_EXPORT = [
  "Use concise updates: progress, blocker, next action.",
  "When reporting delays, include cause, impact, and mitigation plan.",
  "Confirm decisions in writing after meetings to avoid cross-language ambiguity.",
  "Respect hierarchy while still asking clear and proactive questions.",
];

function buildStorageKey(userId: string) {
  return `kbridge_dynamic_checklist_${userId}`;
}

export function ChecklistPanel({ userId }: ChecklistPanelProps) {
  const [position, setPosition] = useState(DEFAULT_STATE.position);
  const [company, setCompany] = useState(DEFAULT_STATE.company);
  const [startDate, setStartDate] = useState(DEFAULT_STATE.startDate);
  const [tasks, setTasks] = useState<DynamicChecklistTask[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [regeneratingCategory, setRegeneratingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ChecklistCategory>("Cultural Adaptation");
  const [celebrationMessage, setCelebrationMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(buildStorageKey(userId));
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ChecklistState;
      setPosition(parsed.position || DEFAULT_STATE.position);
      setCompany(parsed.company || DEFAULT_STATE.company);
      setStartDate(parsed.startDate || DEFAULT_STATE.startDate);
      setTasks(parsed.tasks || []);
      setCompleted(parsed.completed || []);
    } catch {
      // Keep defaults when local data is malformed.
    }
  }, [userId]);

  function persistState(next: Partial<ChecklistState>) {
    const snapshot: ChecklistState = {
      position: next.position ?? position,
      company: next.company ?? company,
      startDate: next.startDate ?? startDate,
      tasks: next.tasks ?? tasks,
      completed: next.completed ?? completed,
    };
    localStorage.setItem(buildStorageKey(userId), JSON.stringify(snapshot));
  }

  async function generateChecklist() {
    if (!position.trim() || !company.trim() || !startDate) return;
    setLoadingChecklist(true);
    setCelebrationMessage("");
    try {
      const response = await fetch("/api/checklist/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, company, startDate }),
      });
      const data = await response.json();
      const nextTasks: DynamicChecklistTask[] = Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(nextTasks);
      setCompleted([]);
      persistState({
        position,
        company,
        startDate,
        tasks: nextTasks,
        completed: [],
      });
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function toggleTask(taskId: string) {
    const wasCompleted = completed.includes(taskId);
    const nextCompleted = wasCompleted
      ? completed.filter((id) => id !== taskId)
      : [...completed, taskId];

    setCompleted(nextCompleted);
    persistState({ completed: nextCompleted });

    if (!wasCompleted) {
      const completedTask = tasks.find((task) => task.id === taskId);
      if (!completedTask) return;

      try {
        const response = await fetch("/api/checklist/celebrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: completedTask }),
        });
        const data = await response.json();
        setCelebrationMessage(
          data.message || "Tuyet voi! Ban dang tien bo rat nhanh. (Great progress!)",
        );
      } catch {
        setCelebrationMessage(
          "Tuyet voi! Ban vua hoan thanh mot cot moc quan trong. (Great milestone completed!)",
        );
      }
    }
  }

  async function regenerateCategory() {
    if (tasks.length === 0) return;
    const targetDays = tasks
      .filter(
        (task) =>
          task.category === selectedCategory && !completed.includes(task.id),
      )
      .map((task) => task.day);

    if (targetDays.length === 0) {
      setCelebrationMessage(
        "Danh muc nay da hoan thanh hoac khong co task dang mo. (No incomplete tasks in this category.)",
      );
      return;
    }

    setRegeneratingCategory(true);
    try {
      const response = await fetch("/api/checklist/regenerate-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          company,
          startDate,
          category: selectedCategory,
          targetDays,
        }),
      });
      const data = await response.json();
      const regenerated: DynamicChecklistTask[] = Array.isArray(data.tasks)
        ? data.tasks
        : [];
      const replacementsByDay = new Map(
        regenerated.map((task) => [task.day, task]),
      );

      const nextTasks = tasks.map((task) => {
        const isTarget =
          task.category === selectedCategory && !completed.includes(task.id);
        if (!isTarget) return task;
        return replacementsByDay.get(task.day) ?? task;
      });

      setTasks(nextTasks);
      persistState({ tasks: nextTasks });
      setCelebrationMessage(
        `Da tao lai cac task chua hoan thanh trong danh muc "${selectedCategory}". (Regenerated incomplete tasks for this category.)`,
      );
    } finally {
      setRegeneratingCategory(false);
    }
  }

  async function exportChecklistAsPdf() {
    if (tasks.length === 0) return;

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

    const completedTasks = tasks.filter((task) => completed.includes(task.id));
    const today = new Date().toLocaleDateString("en-CA");

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("K-Bridge AI - Checklist Report", marginX, y);
    y += 24;

    pdf.setFont("helvetica", "normal");
    addWrappedLine(`Position: ${position}`);
    addWrappedLine(`Company: ${company}`);
    addWrappedLine(`Start date: ${startDate}`);
    addWrappedLine(`Export date: ${today}`);
    addWrappedLine(
      `Progress: ${progress}% (${completedTasks.length}/${tasks.length} tasks completed)`,
    );
    y += 8;

    pdf.setFont("helvetica", "bold");
    addWrappedLine("Completed Tasks", 12, 18);
    pdf.setFont("helvetica", "normal");
    if (completedTasks.length === 0) {
      addWrappedLine("- No completed tasks yet.");
    } else {
      completedTasks.forEach((task) => {
        addWrappedLine(
          `- Day ${task.day} | ${task.category} | ${task.title}: ${task.description}`,
        );
      });
    }

    y += 8;
    pdf.setFont("helvetica", "bold");
    addWrappedLine("Cultural Tips", 12, 18);
    pdf.setFont("helvetica", "normal");
    CULTURAL_TIPS_FOR_EXPORT.forEach((tip) => addWrappedLine(`- ${tip}`));

    pdf.save(`kbridge-checklist-${today}.pdf`);
  }

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completed.length / tasks.length) * 100);
  }, [completed.length, tasks.length]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Smart 30-Day Checklist</CardTitle>
        <CardDescription>AI-personalized by position, company, and your start date</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-1">
            <Input
              list="position-options"
              value={position}
              onChange={(event) => {
                const value = event.target.value;
                setPosition(value);
                persistState({ position: value });
              }}
              placeholder="Select or type position"
            />
            <datalist id="position-options">
              {POSITION_OPTIONS.map((job) => (
                <option key={job} value={job} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Input
              list="company-options"
              value={company}
              onChange={(event) => {
                const value = event.target.value;
                setCompany(value);
                persistState({ company: value });
              }}
              placeholder="Select or type company"
            />
            <datalist id="company-options">
              {COMPANY_OPTIONS.map((companyName) => (
                <option key={companyName} value={companyName} />
              ))}
            </datalist>
          </div>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              persistState({ startDate: value });
            }}
          />
          <Button className="w-full" onClick={generateChecklist} disabled={loadingChecklist}>
            {loadingChecklist ? "Generating checklist..." : "Generate Personalized Checklist"}
          </Button>

          <div className="grid grid-cols-1 gap-2">
            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as ChecklistCategory)
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={regenerateCategory}
              disabled={regeneratingCategory || tasks.length === 0}
              className="w-full whitespace-nowrap text-sm"
            >
              {regeneratingCategory ? "Regenerating..." : "Regenerate Category"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
          <Button
            variant="outline"
            className="w-full"
            onClick={exportChecklistAsPdf}
            disabled={tasks.length === 0}
          >
            <Download className="size-4" />
            Export Checklist as PDF
          </Button>
        </div>

        {celebrationMessage && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {celebrationMessage}
          </div>
        )}

        <ScrollArea className="h-[430px] rounded-xl border border-slate-100 p-2">
          <div className="space-y-2">
            {tasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                Generate your AI checklist to see day-by-day onboarding tasks.
              </div>
            )}
            {tasks.map((task) => {
              const isDone = completed.includes(task.id);
              return (
                <button
                  key={task.id}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    isDone
                      ? "border-blue-200 bg-blue-50/70"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                  onClick={() => toggleTask(task.id)}
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 size-5 text-blue-600" />
                  ) : (
                    <Circle className="mt-0.5 size-5 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      Day {task.day}: {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{task.category}</Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
