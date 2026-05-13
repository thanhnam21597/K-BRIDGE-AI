"use client";

import { useMemo, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function RolePlayPanel() {
  const [scenario, setScenario] = useState(
    "Weekly status meeting with a Korean team lead about delayed tasks",
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
        <Input value={scenario} onChange={(event) => setScenario(event.target.value)} />
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
