"use client";

import { Rocket, ArrowRight, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureKey } from "@/lib/types";

type DemoFlowPanelProps = {
  onGoToFeature: (feature: FeatureKey) => void;
};

const DEMO_STEPS: {
  id: string;
  title: string;
  duration: string;
  detail: string;
  targetFeature: FeatureKey;
  cta: string;
}[] = [
  {
    id: "step-1",
    title: "B1 - Show KPI onboarding",
    duration: "~45s",
    detail:
      "Mở KPI để cho thấy hiệu quả định lượng: % task tuần 1, số câu hỏi chatbot đã giải quyết, số lần dịch, self-rating trước/sau onboarding.",
    targetFeature: "onboarding-kpi",
    cta: "Open KPI",
  },
  {
    id: "step-2",
    title: "B2 - Show Ask Who escalation",
    duration: "~45s",
    detail:
      "Mô phỏng tình huống “không biết hỏi ai”, mở Ask Who để giám khảo thấy luồng gợi ý đúng người + template tin nhắn sẵn.",
    targetFeature: "ask-who",
    cta: "Open Ask Who",
  },
  {
    id: "step-3",
    title: "B3 - Show Weekly Timeline",
    duration: "~45s",
    detail:
      "Mở Weekly Timeline để minh hoạ weekly goals, weekly review, checkpoint completion và weekly note.",
    targetFeature: "weekly-timeline",
    cta: "Open Weekly Timeline",
  },
  {
    id: "step-4",
    title: "B4 - Export Weekly Review PDF",
    duration: "~45s",
    detail:
      "Tại Weekly Timeline, bấm nút Export Weekly Review PDF trên từng tuần để tạo báo cáo gửi mentor/manager.",
    targetFeature: "weekly-timeline",
    cta: "Go to Export Screen",
  },
];

export function DemoFlowPanel({ onGoToFeature }: DemoFlowPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-4 text-blue-600" />
          Demo Flow (3 minutes)
        </CardTitle>
        <CardDescription>
          {"Luồng bấm tuần tự để giám khảo xem nhanh giá trị sản phẩm: KPI -> Ask Who -> Weekly Timeline -> Export PDF."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DEMO_STEPS.map((step) => (
          <div key={step.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
              <Badge variant="outline">{step.duration}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-600">{step.detail}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8 text-xs"
              onClick={() => onGoToFeature(step.targetFeature)}
            >
              {step.id === "step-4" ? <FileDown className="size-3.5" /> : <ArrowRight className="size-3.5" />}
              {step.cta}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
