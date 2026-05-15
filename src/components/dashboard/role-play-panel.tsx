"use client";

import { useMemo, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ROLEPLAY_CASES = [
  "Report delay to Korean team lead with mitigation plan",
  "Ask for help when requirement is unclear in sprint task",
  "Respond to strict feedback while keeping respectful tone",
  "Prepare and speak in weekly status meeting",
  "Handle mild conflict or misunderstanding in remote chat",
] as const;

export function RolePlayPanel() {
  const [scenario, setScenario] = useState(
    ROLEPLAY_CASES[0],
  );
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const canRun = useMemo(
    () => scenario.trim().length > 5 && message.trim().length > 0 && !loading,
    [scenario, message, loading],
  );

  async function onRun() {
    if (!canRun) return;
    setLoading(true);
    try {
      const response = await fetch("/api/role-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, message }),
      });
      const data = await response.json();
      setReply(data.reply ?? "No response.");
    } catch {
      setReply("Simulation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="size-4 text-blue-600" />
          Role-play Conversation Simulator
        </CardTitle>
        <CardDescription>Practice realistic Korean workplace conversations safely</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {ROLEPLAY_CASES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScenario(item)}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
            >
              {item}
            </button>
          ))}
        </div>
        <Input value={scenario} onChange={(event) => setScenario(event.target.value)} />
        <div className="flex items-center gap-2">
          <Badge variant="outline">Case-based practice</Badge>
          <p className="text-xs text-slate-500">
            Use VN first, keep polite tone, include next action.
          </p>
        </div>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type your message to your Korean colleague..."
        />
        <Button onClick={onRun} disabled={!canRun}>
          {loading ? "Simulating..." : "Simulate Conversation"}
        </Button>
        <Textarea value={reply} readOnly className="min-h-32 bg-slate-50" />
      </CardContent>
    </Card>
  );
}
