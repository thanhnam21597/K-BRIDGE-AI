"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageCode } from "@/lib/types";

export function TranslatorPanel() {
  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");
  const [from, setFrom] = useState<LanguageCode>("vi");
  const [to, setTo] = useState<LanguageCode>("ko");
  const [loading, setLoading] = useState(false);

  const canTranslate = useMemo(
    () => sourceText.trim().length > 0 && from !== to && !loading,
    [sourceText, from, to, loading],
  );

  async function onTranslate() {
    if (!canTranslate) return;
    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, from, to }),
      });
      const data = await response.json();
      setTranslated(data.translatedText ?? "Unable to translate.");
    } catch {
      setTranslated("Translation failed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  function swapLanguages() {
    setFrom(to);
    setTo(from);
    setSourceText(translated || sourceText);
    setTranslated(sourceText);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="size-4 text-blue-600" />
          Real-time Translator
        </CardTitle>
        <CardDescription>Vietnamese, English, and Korean for business communication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Input value={from} onChange={(e) => setFrom(e.target.value as LanguageCode)} />
          <Button variant="secondary" size="icon" onClick={swapLanguages}>
            <ArrowLeftRight className="size-4" />
          </Button>
          <Input value={to} onChange={(e) => setTo(e.target.value as LanguageCode)} />
        </div>

        <Textarea
          placeholder="Nhap noi dung can dich (business context)..."
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          className="min-h-32"
        />

        <Button onClick={onTranslate} disabled={!canTranslate}>
          {loading ? "Translating..." : "Translate"}
        </Button>

        <Textarea value={translated} readOnly className="min-h-32 bg-slate-50" />
      </CardContent>
    </Card>
  );
}
