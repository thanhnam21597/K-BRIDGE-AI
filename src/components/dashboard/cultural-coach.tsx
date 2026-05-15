"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Database,
  Languages,
  Mic,
  Paperclip,
  Send,
  WandSparkles,
  ThumbsDown,
  ThumbsUp,
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
import { AskWhoScenarioId, detectAskWhoScenarioFromText } from "@/lib/ask-who";
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
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence?: number;
};

type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike> & {
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type VoiceMode = "valsea" | "browser";

type CulturalCoachProps = {
  userId: string;
  onAskWhoDeepLink?: (scenarioId: AskWhoScenarioId) => void;
};

type VoiceLanguage = "vi-VN" | "en-US";
type TranslateLanguage = "vi" | "en" | "ko";
type MessageTranslationState = {
  loading: boolean;
  translatedText?: string;
  targetLanguage?: TranslateLanguage;
  error?: string;
};
type CoachFeedbackRating = "up" | "down";
type CoachFeedbackState = {
  rating: CoachFeedbackRating;
  loading: boolean;
  reason?: string;
};

const VOICE_LANGUAGE_OPTIONS: { value: VoiceLanguage; label: string }[] = [
  { value: "vi-VN", label: "VI" },
  { value: "en-US", label: "EN" },
];

const VIETNAMESE_HINT_WORDS = [
  "xin chao",
  "cam on",
  "toi",
  "ban",
  "minh",
  "khong",
  "giup",
  "van hoa",
  "giao tiep",
  "cuoc hop",
  "bao cao",
  "sep",
  "han quoc",
  "hom nay",
  "lam sao",
];

const ENGLISH_HINT_WORDS = [
  "hello",
  "thanks",
  "thank you",
  "please",
  "meeting",
  "report",
  "delay",
  "work",
  "culture",
  "korean",
  "today",
  "help",
  "manager",
  "email",
];

export function CulturalCoach({ userId, onAskWhoDeepLink }: CulturalCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCorrectingTranscript, setIsCorrectingTranscript] = useState(false);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("vi-VN");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [clearingHistory, setClearingHistory] = useState(false);
  const [uploadedDocCount, setUploadedDocCount] = useState(0);
  const [kbStatus, setKbStatus] = useState<{
    seeded: boolean;
    count: number;
    loading: boolean;
  }>({ seeded: false, count: 0, loading: true });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceInputBaseRef = useRef("");
  const voiceFinalTranscriptRef = useRef("");
  const voiceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceModeRef = useRef<VoiceMode | null>(null);
  const voiceHadErrorRef = useRef(false);
  const voiceHadSpeechRef = useRef(false);
  const storageKey = `kbridge_chat_history_${userId}`;
  const translationStorageKey = `kbridge_chat_translations_${userId}`;
  const feedbackStorageKey = `kbridge_chat_feedback_${userId}`;
  const autoCorrectStorageKey = `kbridge_voice_autocorrect_${userId}`;
  const [messageTranslations, setMessageTranslations] = useState<
    Record<string, MessageTranslationState>
  >({});
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, CoachFeedbackState>>(
    {},
  );

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
    const raw = localStorage.getItem(translationStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, MessageTranslationState>;
      setMessageTranslations(parsed);
    } catch {
      // Ignore malformed cache.
    }
  }, [translationStorageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(autoCorrectStorageKey);
    if (stored === "false") {
      setAutoCorrectEnabled(false);
      return;
    }
    if (stored === "true") {
      setAutoCorrectEnabled(true);
    }
  }, [autoCorrectStorageKey]);

  useEffect(() => {
    localStorage.setItem(autoCorrectStorageKey, autoCorrectEnabled ? "true" : "false");
  }, [autoCorrectEnabled, autoCorrectStorageKey]);

  useEffect(() => {
    localStorage.setItem(translationStorageKey, JSON.stringify(messageTranslations));
  }, [messageTranslations, translationStorageKey]);

  useEffect(() => {
    const raw = localStorage.getItem(feedbackStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, CoachFeedbackState>;
      setFeedbackByMessageId(parsed);
    } catch {
      // Ignore malformed cache.
    }
  }, [feedbackStorageKey]);

  useEffect(() => {
    localStorage.setItem(feedbackStorageKey, JSON.stringify(feedbackByMessageId));
  }, [feedbackByMessageId, feedbackStorageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    const existingIds = new Set(messages.map((message) => message.id));
    setMessageTranslations((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([messageId]) => existingIds.has(messageId)),
      ),
    );
  }, [messages]);

  useEffect(() => {
    const existingIds = new Set(messages.map((message) => message.id));
    setFeedbackByMessageId((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([messageId]) => existingIds.has(messageId)),
      ),
    );
  }, [messages]);

  useEffect(() => {
    return () => {
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
    };
  }, []);

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

    const matchedScenario = detectAskWhoScenarioFromText(content);
    if (matchedScenario && onAskWhoDeepLink) {
      onAskWhoDeepLink(matchedScenario);
    }

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: userMsg.content,
          responseLanguage: "vi",
        }),
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

  async function autoCorrectVoiceTranscript(rawTranscript: string) {
    const normalized = rawTranscript.replace(/\s+/g, " ").trim();
    if (!normalized) return;

    setIsCorrectingTranscript(true);
    try {
      const response = await fetch("/api/agent/voice-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: normalized, language: voiceLanguage }),
      });
      const data = await response.json();
      const corrected = String(data.corrected ?? "").replace(/\s+/g, " ").trim();
      if (response.ok && corrected) {
        setInput(corrected);
      }
    } catch {
      // Keep raw transcript in input as fallback.
    } finally {
      setIsCorrectingTranscript(false);
    }
  }

  function pickBestTranscript(result: SpeechRecognitionResultLike) {
    const alternatives = Array.from(result ?? []);
    if (alternatives.length === 0) return "";

    const sorted = [...alternatives].sort(
      (first, second) => (second.confidence ?? 0) - (first.confidence ?? 0),
    );
    return sorted[0]?.transcript?.trim() ?? "";
  }

  async function transcribeAudioWithValsea(audioBlob: Blob) {
    const ext = audioBlob.type.includes("wav")
      ? "wav"
      : audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a")
        ? "m4a"
        : "webm";
    const audioFile = new File([audioBlob], `coach-voice.${ext}`, {
      type: audioBlob.type || "audio/webm",
    });
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("language", voiceLanguage === "vi-VN" ? "vi" : "en");

    const response = await fetch("/api/agent/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    const transcript = String(data.transcript ?? "").replace(/\s+/g, " ").trim();
    if (!response.ok || !transcript) {
      throw new Error(String(data.detail ?? data.error ?? "Failed to transcribe audio"));
    }
    return transcript;
  }

  function startBrowserSpeechRecognition() {
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
    voiceInputBaseRef.current = input.trim();
    voiceFinalTranscriptRef.current = "";
    voiceHadErrorRef.current = false;
    voiceHadSpeechRef.current = false;
    recognition.lang = voiceLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 5;
    voiceModeRef.current = "browser";
    recognition.onresult = (event) => {
      let liveText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = pickBestTranscript(result);
        if (!transcript) continue;
        voiceHadSpeechRef.current = true;

        if (result.isFinal) {
          voiceFinalTranscriptRef.current = `${voiceFinalTranscriptRef.current} ${transcript}`.trim();
        } else {
          liveText = `${liveText} ${transcript}`.trim();
        }
      }

      const mergedText = [voiceInputBaseRef.current, voiceFinalTranscriptRef.current, liveText]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      setInterimTranscript(liveText);
      setInput(mergedText);
    };
    recognition.onend = () => {
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
      const rawTranscript = [
        voiceInputBaseRef.current,
        voiceFinalTranscriptRef.current,
        interimTranscript,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!voiceHadErrorRef.current && !voiceHadSpeechRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Mình chưa nghe rõ giọng nói của bạn. Hãy thử nói gần microphone hơn và cho phép quyền micro trên trình duyệt.",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (rawTranscript) {
        if (autoCorrectEnabled) {
          void autoCorrectVoiceTranscript(rawTranscript);
        } else {
          setInput(rawTranscript);
        }
      }
      setIsListening(false);
      setInterimTranscript("");
      voiceInputBaseRef.current = "";
      voiceFinalTranscriptRef.current = "";
      voiceModeRef.current = null;
    };
    recognition.onerror = (event) => {
      voiceHadErrorRef.current = true;
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
      const messageByError: Record<string, string> = {
        "not-allowed":
          "Trinh duyet dang chan microphone. Ban hay bam icon lock ben canh URL va cho phep mic.",
        "service-not-allowed":
          "Dich vu nhan dang giong noi dang bi chan tren trinh duyet nay.",
        "audio-capture":
          "Khong tim thay microphone hoac microphone dang duoc app khac su dung.",
        "no-speech":
          "Khong nghe thay giong noi. Thu noi ro hon hoac tang do nhay microphone.",
        "language-not-supported":
          "Ngon ngu voice hien tai chua duoc ho tro tren trinh duyet nay. Thu doi sang VI/EN khac.",
      };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            messageByError[event.error] ??
            "Voice input gap loi khong xac dinh. Ban thu tat/mo lai voice hoac reload trang.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setIsListening(false);
      setInterimTranscript("");
      voiceInputBaseRef.current = "";
      voiceFinalTranscriptRef.current = "";
      voiceModeRef.current = null;
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
      voiceStopTimerRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
      }, 20000);
    } catch {
      setIsListening(false);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Khong the bat voice input luc nay. Ban vui long doi 1-2 giay va thu lai.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  async function startValseaRecording() {
    if (
      typeof window === "undefined" ||
      !window.navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      return false;
    }

    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const supportedMimeType = preferredMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
      );

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      voiceModeRef.current = "valsea";
      voiceInputBaseRef.current = input.trim();
      setInterimTranscript("Recording...");
      setIsListening(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        setInterimTranscript("");
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        voiceModeRef.current = null;
      };

      recorder.onstop = async () => {
        if (voiceStopTimerRef.current) {
          clearTimeout(voiceStopTimerRef.current);
        }

        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);
        setInterimTranscript("");
        voiceModeRef.current = null;

        if (chunks.length === 0) {
          startBrowserSpeechRecognition();
          return;
        }

        try {
          const audioBlob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
          const transcript = await transcribeAudioWithValsea(audioBlob);
          const mergedTranscript = [voiceInputBaseRef.current, transcript]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (autoCorrectEnabled) {
            await autoCorrectVoiceTranscript(mergedTranscript);
          } else {
            setInput(mergedTranscript);
          }
        } catch {
          startBrowserSpeechRecognition();
        } finally {
          voiceInputBaseRef.current = "";
        }
      };

      recorder.start(250);
      voiceStopTimerRef.current = setTimeout(() => {
        mediaRecorderRef.current?.stop();
      }, 20000);
      return true;
    } catch {
      return false;
    }
  }

  async function onVoiceInputClick() {
    if (isListening) {
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
      if (voiceModeRef.current === "valsea") {
        mediaRecorderRef.current?.stop();
      } else {
        recognitionRef.current?.stop();
      }
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    const startedWithValsea = await startValseaRecording();
    if (!startedWithValsea) {
      startBrowserSpeechRecognition();
    }
  }

  function detectMessageLanguage(text: string): TranslateLanguage {
    const vietnameseDiacriticsRegex =
      /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
    if (vietnameseDiacriticsRegex.test(text)) return "vi";

    const normalized = text.toLowerCase();
    const viScore = VIETNAMESE_HINT_WORDS.reduce(
      (score, keyword) => (normalized.includes(keyword) ? score + 1 : score),
      0,
    );
    const enScore = ENGLISH_HINT_WORDS.reduce(
      (score, keyword) => (normalized.includes(keyword) ? score + 1 : score),
      0,
    );

    if (viScore >= enScore) return "vi";
    return "en";
  }

  async function onTranslateMessage(message: ChatMessage, targetLanguage: TranslateLanguage) {
    setMessageTranslations((previous) => ({
      ...previous,
      [message.id]: { loading: true, targetLanguage },
    }));

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message.content,
          from: "auto",
          to: targetLanguage,
        }),
      });
      const data = await response.json();
      const translatedText = String(data.translatedText ?? "").trim();

      if (!response.ok || !translatedText) {
        throw new Error(data.error ?? "Translate failed");
      }

      setMessageTranslations((previous) => ({
        ...previous,
        [message.id]: {
          loading: false,
          translatedText,
          targetLanguage,
        },
      }));
    } catch {
      setMessageTranslations((previous) => ({
        ...previous,
        [message.id]: {
          loading: false,
          targetLanguage,
          error: `Khong the dich sang ${targetLanguage.toUpperCase()} luc nay.`,
        },
      }));
    }
  }

  function findRelatedUserMessage(index: number) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (messages[cursor]?.role === "user") {
        return messages[cursor].content;
      }
    }
    return "";
  }

  async function onCoachFeedback(
    message: ChatMessage,
    index: number,
    rating: CoachFeedbackRating,
  ) {
    const previous = feedbackByMessageId[message.id];
    if (previous?.loading) return;

    const reason =
      rating === "down"
        ? window.prompt(
            "Ban co the ghi ly do ngan de AI hoc tot hon (optional):",
            previous?.reason ?? "",
          ) ?? ""
        : "";

    setFeedbackByMessageId((current) => ({
      ...current,
      [message.id]: { rating, loading: true, reason: reason.trim() || undefined },
    }));

    try {
      const response = await fetch("/api/agent/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          messageId: message.id,
          rating,
          reason: reason.trim() || undefined,
          userMessage: findRelatedUserMessage(index),
          assistantMessage: message.content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feedback");
      }

      setFeedbackByMessageId((current) => ({
        ...current,
        [message.id]: { rating, loading: false, reason: reason.trim() || undefined },
      }));
    } catch {
      setFeedbackByMessageId((current) => {
        const fallback = current[message.id];
        if (!fallback) return current;
        return { ...current, [message.id]: { ...fallback, loading: false } };
      });
    }
  }

  async function clearChatHistory() {
    setClearingHistory(true);
    try {
      await fetch(`/api/agent/chat?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
    } finally {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(translationStorageKey);
      setMessageTranslations({});
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
            {messages.map((message, index) => (
              ((index) => {
                const translationState = messageTranslations[message.id];
                const guessedSourceLanguage = detectMessageLanguage(message.content);
                const feedbackState = feedbackByMessageId[message.id];
                const isAssistant = message.role === "assistant";

                return (
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
                  <>
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
                        {translationState?.translatedText && (
                          <div
                            className={cn(
                              "mt-1 rounded-xl border px-3 py-2 text-sm",
                              message.role === "assistant"
                                ? "border-slate-200 bg-white text-slate-700"
                                : "border-blue-200 bg-blue-50 text-blue-900",
                            )}
                          >
                            {translationState.translatedText}
                          </div>
                        )}
                        {translationState?.error && (
                          <p className="mt-1 px-1 text-[11px] text-rose-500">{translationState.error}</p>
                        )}
                  </>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-2 px-1",
                      message.role === "user" && "justify-end",
                    )}
                  >
                  <p
                    className={cn(
                      "text-[11px] text-slate-400",
                    )}
                  >
                    {formatTimestamp(message.createdAt)}
                  </p>
                    <button
                      type="button"
                      onClick={() => void onTranslateMessage(message, "en")}
                      disabled={Boolean(messageTranslations[message.id]?.loading) || loading}
                      className="text-[11px] text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {translationState?.loading && translationState.targetLanguage === "en"
                        ? "Translating to EN..."
                        : translationState?.targetLanguage === "en"
                          ? "Translate to EN again"
                          : guessedSourceLanguage === "en"
                            ? "Translate this message (auto -> EN)"
                            : "Translate this message (VI -> EN)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onTranslateMessage(message, "vi")}
                      disabled={Boolean(messageTranslations[message.id]?.loading) || loading}
                      className="text-[11px] text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {translationState?.loading && translationState.targetLanguage === "vi"
                        ? "Dang dich sang VI..."
                        : translationState?.targetLanguage === "vi"
                          ? "Dich lai sang VI"
                          : guessedSourceLanguage === "vi"
                            ? "Dich thong diep nay (auto -> VI)"
                            : "Dich thong diep nay (EN -> VI)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onTranslateMessage(message, "ko")}
                      disabled={Boolean(messageTranslations[message.id]?.loading) || loading}
                      className="text-[11px] text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {translationState?.loading && translationState.targetLanguage === "ko"
                        ? "Dang dich sang KO..."
                        : translationState?.targetLanguage === "ko"
                          ? "Dich lai sang KO"
                          : "Dich thong diep nay (-> KO)"}
                    </button>
                    {isAssistant && (
                      <>
                        <button
                          type="button"
                          onClick={() => void onCoachFeedback(message, index, "up")}
                          disabled={Boolean(feedbackState?.loading) || loading}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] hover:underline disabled:cursor-not-allowed",
                            feedbackState?.rating === "up" ? "text-emerald-600" : "text-slate-500",
                          )}
                          title="Helpful feedback"
                        >
                          <ThumbsUp className="size-3.5" />
                          {feedbackState?.loading && feedbackState?.rating === "up"
                            ? "Saving..."
                            : "Helpful"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onCoachFeedback(message, index, "down")}
                          disabled={Boolean(feedbackState?.loading) || loading}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] hover:underline disabled:cursor-not-allowed",
                            feedbackState?.rating === "down" ? "text-rose-600" : "text-slate-500",
                          )}
                          title="Need improvement"
                        >
                          <ThumbsDown className="size-3.5" />
                          {feedbackState?.loading && feedbackState?.rating === "down"
                            ? "Saving..."
                            : "Improve"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <Avatar className="mt-0.5 size-8 ring-1 ring-blue-100">
                    <AvatarFallback className="bg-slate-100 text-slate-700">
                      <UserRound className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                  </div>
                );
              })(index)
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
          <div className="relative">
            <span
              className={cn(
                "pointer-events-none absolute inset-0 rounded-md bg-blue-400/30 opacity-0",
                isListening && "animate-ping opacity-100",
              )}
            />
            <Button
              size="icon"
              variant={isListening ? "default" : "outline"}
              onClick={onVoiceInputClick}
              disabled={loading}
              title={
                isListening
                  ? `Stop voice input (${voiceLanguage})`
                  : `Start voice input (${voiceLanguage})`
              }
              className="relative"
            >
              <Mic className={cn("size-4", isListening && "animate-pulse")} />
            </Button>
          </div>
          <Button
            type="button"
            variant={autoCorrectEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setAutoCorrectEnabled((previous) => !previous)}
            disabled={isListening || loading || isCorrectingTranscript}
            className="h-10 w-10"
            title={
              autoCorrectEnabled
                ? "Auto-correct ON (tap to turn OFF)"
                : "Auto-correct OFF (tap to turn ON)"
            }
            aria-label={
              autoCorrectEnabled
                ? "Auto-correct ON (tap to turn OFF)"
                : "Auto-correct OFF (tap to turn ON)"
            }
          >
            <WandSparkles className={cn("size-4", autoCorrectEnabled && "text-white")} />
          </Button>
          <div className="flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
            <Languages className="size-3.5 text-slate-500" />
            <select
              value={voiceLanguage}
              onChange={(event) => setVoiceLanguage(event.target.value as VoiceLanguage)}
              disabled={isListening || loading}
              className="bg-transparent outline-none"
              title="Voice recognition language"
            >
              {VOICE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button size="icon" onClick={onSend} disabled={!canSend}>
            <Send className="size-4" />
          </Button>
        </div>
        {isListening && (
          <div className="space-y-1">
            <p className="text-xs text-blue-600">
              Listening... Speak in {voiceLanguage === "vi-VN" ? "Vietnamese" : "English"}.
            </p>
            <p className="text-[11px] text-slate-500">
              Tip: Noi cham va ro, tam dung ngan giua cac cum tu de nhan dang chinh xac hon.
            </p>
            {interimTranscript && (
              <p className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                Live transcript: {interimTranscript}
              </p>
            )}
          </div>
        )}
        {isCorrectingTranscript && (
          <p className="text-xs text-emerald-600">
            Dang auto-correct transcript bang AI de cho ket qua chinh xac hon...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
