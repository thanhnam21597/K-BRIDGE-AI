"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ASK_WHO_SCENARIOS,
  AskWhoScenarioId,
  DEFAULT_ASK_WHO_SCENARIO_ID,
} from "@/lib/ask-who";

type AskWhoPanelProps = {
  selectedScenarioId?: AskWhoScenarioId;
  onSelectedScenarioIdChange?: (scenarioId: AskWhoScenarioId) => void;
};

export function AskWhoPanel({
  selectedScenarioId,
  onSelectedScenarioIdChange,
}: AskWhoPanelProps = {}) {
  const [localSelectedScenarioId, setLocalSelectedScenarioId] = useState<AskWhoScenarioId>(
    selectedScenarioId ?? DEFAULT_ASK_WHO_SCENARIO_ID,
  );
  const [copiedKey, setCopiedKey] = useState("");
  const effectiveScenarioId = selectedScenarioId ?? localSelectedScenarioId;

  const selectedScenario = useMemo(
    () =>
      ASK_WHO_SCENARIOS.find((scenario) => scenario.id === effectiveScenarioId) ??
      ASK_WHO_SCENARIOS[0],
    [effectiveScenarioId],
  );

  useEffect(() => {
    if (!selectedScenarioId) return;
    setLocalSelectedScenarioId(selectedScenarioId);
  }, [selectedScenarioId]);

  function onScenarioChange(nextId: AskWhoScenarioId) {
    setLocalSelectedScenarioId(nextId);
    onSelectedScenarioIdChange?.(nextId);
  }

  async function onCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1200);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundCheck className="size-4 text-blue-600" />
          Ask Who / Escalation
        </CardTitle>
        <CardDescription>
          Khong biet hoi ai? Chon tinh huong de nhan dung dau moi + mau tin nhan copy nhanh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={effectiveScenarioId}
          onChange={(event) => onScenarioChange(event.target.value as AskWhoScenarioId)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          {ASK_WHO_SCENARIOS.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.title}
            </option>
          ))}
        </select>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm">
          <p className="font-medium text-blue-900">{selectedScenario.context}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-700">
            <AlertTriangle className="size-3.5" />
            Escalation rule: {selectedScenario.escalationRule}
          </p>
        </div>

        <div className="space-y-3">
          {selectedScenario.targets.map((target, index) => {
            const copyId = `${selectedScenario.id}-${target.role}`;
            return (
              <div key={copyId} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <p className="text-sm font-semibold text-slate-800">{target.role}</p>
                  </div>
                  <Badge variant="accent">{target.expectedResponseWindow}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">{target.why}</p>
                <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700">
                  {target.messageTemplate}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-blue-700"
                  onClick={() => void onCopy(target.messageTemplate, copyId)}
                >
                  <Copy className="size-3.5" />
                  {copiedKey === copyId ? "Copied" : "Copy template"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
