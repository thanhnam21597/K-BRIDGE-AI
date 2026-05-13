"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTip } from "@/lib/types";

export function DailyTipsPanel() {
  const [tips, setTips] = useState<DailyTip[]>([]);

  useEffect(() => {
    const abortController = new AbortController();

    fetch("/api/daily-tips", { signal: abortController.signal })
      .then((response) => response.json())
      .then((data) => setTips(data.tips ?? []))
      .catch(() => {
        setTips([]);
      });

    return () => abortController.abort();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-600" />
          Personalized Daily Tips
        </CardTitle>
        <CardDescription>Small habits that accelerate your integration journey</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip) => (
          <div key={tip.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-medium text-slate-800">{tip.title}</p>
              <Badge variant="accent">{tip.category}</Badge>
            </div>
            <p className="text-sm text-slate-600">{tip.content}</p>
          </div>
        ))}
        {tips.length === 0 && (
          <p className="text-sm text-slate-500">No tips yet. Refresh to load personalized tips.</p>
        )}
      </CardContent>
    </Card>
  );
}
