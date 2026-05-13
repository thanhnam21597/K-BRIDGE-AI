"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Database,
  Mic,
  Paperclip,
  Send,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome-msg",
  role: "assistant",
  content:
    "Chao mung ban den voi K-Bridge AI. Minh co the giup ban hieu van hoa lam viec Han Quoc va cach giao tiep chuyen nghiep.",
  createdAt: new Date().toISOString(),
};

const SUGGESTED_QUESTIONS = [
  "Hôm nay có weekly meeting, mình nên chuẩn bị gì?",
  "Làm sao report delay với sếp Hàn?",
  "Dịch giúp email này",
] as const;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type CulturalCoachProps = {
  userId: string;
};

export function CulturalCoach({ userId }: CulturalCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [uploadedDocCount, setUploadedDocCount] = useState(0);
  const [kbStatus, setKbStatus] = useState<{
    seeded: boolean;
    count: number;
    loading: boolean;
  }>({ seeded: false, count: 0, loading: true });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const storageKey = `kbridge_chat_history_${userId}`;

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );

  useEffect(() => {
    const abortController = new AbortController();
    fetch("/api/admin/kb-status", { signal: abortController.signal })
      .then((response) => response.json())
      .then((data) =>
        setKbStatus({
          seeded: Boolean(data.seeded),
          count: Number(data.count ?? 0),
          loading: false,
        }),
      )
      .catch(() => {
        setKbStatus({ seeded: false, count: 0, loading: false });
      });

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const cachedHistory = localStorage.getItem(storageKey);
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory) as ChatMessage[];
        if (parsed.length > 0) {
          setMessages(parsed);
          return () => abortController.abort();
        }
      } catch {
        // Ignore malformed local cache and continue with server fallback.
      }
    }

    fetch(`/api/agent/chat?userId=${encodeURIComponent(userId)}`, {
      signal: abortController.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        const loaded = Array.isArray(data.messages)
          ? data.messages.map((message: { role: "user" | "assistant"; content: string; createdAt?: string }) => ({
              id: crypto.randomUUID(),
              role: message.role,
              content: message.content,
              createdAt: message.createdAt ?? new Date().toISOString(),
            }))
          : [];
        setMessages(loaded.length > 0 ? loaded : [INITIAL_MESSAGE]);
      })
      .catch(() => {
        setMessages([INITIAL_MESSAGE]);
      });

    return () => abortController.abort();
  }, [storageKey, userId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  async function onSend() {
    if (!canSend) return;
    await sendMessage(input.trim());
  }

  async function sendMessage(content: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: userMsg.content }),
      });
      const data = await response.json();
      await streamAssistantMessage(data.reply ?? "Khong the phan hoi luc nay.");
    } catch {
      await streamAssistantMessage("Loi ket noi. Vui long thu lai trong it phut.");
    } finally {
      setLoading(false);
    }
  }

  async function streamAssistantMessage(fullText: string) {
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    for (let index = 0; index < fullText.length; index += 3) {
      const nextContent = fullText.slice(0, index + 3);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content: nextContent } : message,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  function onSuggestedQuestionClick(question: string) {
    if (loading) return;
    setInput(question);
    void sendMessage(question);
  }

  function onVoiceInputClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const voiceWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const RecognitionCtor =
      voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Trinh duyet cua ban chua ho tro voice input. Ban co the nhap tay de tiep tuc.",
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) setInput((current) => `${current} ${transcript}`.trim());
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function clearChatHistory() {
    setClearingHistory(true);
    try {
      await fetch(`/api/agent/chat?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
    } finally {
      localStorage.removeItem(storageKey);
      setMessages([INITIAL_MESSAGE]);
      setClearingHistory(false);
    }
  }

  function formatTimestamp(isoDate: string) {
    const date = new Date(isoDate);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function onUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/agent/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setUploadedDocCount((current) => current + Number(data.uploadedChunks ?? 0));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Da tai lieu hoa tai lieu cua ban. Toi se dung noi dung nay de tra loi sat voi cong ty hon.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Khong the tai len tai lieu. Ban vui long thu lai voi file TXT, MD, hoac PDF.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-blue-600" />
          Cultural Coach Chatbot
        </CardTitle>
        <CardDescription>Vietnamese-first guidance for Korean workplace onboarding</CardDescription>
      </CardHeader>
      <CardContent className="flex h-[520px] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
          <Badge variant="accent" className="gap-1">
            <Paperclip className="size-3" />
            RAG Docs: {uploadedDocCount}
          </Badge>
          <Badge
            variant={kbStatus.seeded ? "default" : "outline"}
            className="gap-1"
            title="Global Korean-Vietnamese KB seed status"
          >
            <Database className="size-3" />
            {kbStatus.loading
              ? "KB: checking..."
              : kbStatus.seeded
                ? `KB: seeded (${kbStatus.count})`
                : "KB: not seeded"}
          </Badge>
          <label className="inline-flex">
            <Input
              type="file"
              multiple
              accept=".txt,.md,.pdf,.docx,.csv,.json"
              className="hidden"
              onChange={(event) => onUploadFiles(event.target.files)}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-xs font-medium text-blue-700 hover:bg-blue-50">
              <UploadCloud className="size-3.5" />
              {uploading ? "Uploading..." : "Upload JD/Company Docs"}
            </span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChatHistory}
            disabled={clearingHistory || loading}
            className="h-8 text-xs text-slate-600"
          >
            <Trash2 className="mr-1 size-3.5" />
            {clearingHistory ? "Clearing..." : "Clear chat history"}
          </Button>
        </div>

        {!hasUserMessages && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <Button
                key={question}
                variant="secondary"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => onSuggestedQuestionClick(question)}
                disabled={loading}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 rounded-xl border border-slate-100 p-3">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-2", message.role === "user" && "justify-end")}
              >
                {message.role === "assistant" && (
                  <Avatar className="mt-0.5 size-8 ring-1 ring-blue-100">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      <Bot className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={cn("max-w-[82%]")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm shadow-sm",
                      message.role === "assistant"
                        ? "rounded-tl-md bg-slate-100 text-slate-700"
                        : "rounded-tr-md bg-blue-600 text-white",
                    )}
                  >
                    {message.content || "..."}
                  </div>
                  <p
                    className={cn(
                      "mt-1 px-1 text-[11px] text-slate-400",
                      message.role === "user" && "text-right",
                    )}
                  >
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>

                {message.role === "user" && (
                  <Avatar className="mt-0.5 size-8 ring-1 ring-blue-100">
                    <AvatarFallback className="bg-slate-100 text-slate-700">
                      <UserRound className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Hoi ve van hoa, giao tiep, nghi le cong so..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
          />
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            onClick={onVoiceInputClick}
            disabled={loading}
            title={isListening ? "Stop voice input" : "Start voice input"}
          >
            <Mic className={cn("size-4", isListening && "animate-pulse")} />
          </Button>
          <Button size="icon" onClick={onSend} disabled={!canSend}>
            <Send className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
