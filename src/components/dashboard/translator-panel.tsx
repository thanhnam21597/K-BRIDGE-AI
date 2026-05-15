"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Languages, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageCode } from "@/lib/types";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & {
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type VoiceMode = "valsea" | "browser";

type TranslatorPanelProps = {
  userId: string;
};

function toSpeechLocale(language: LanguageCode) {
  if (language === "vi") return "vi-VN";
  if (language === "en") return "en-US";
  return "ko-KR";
}

export function TranslatorPanel({ userId }: TranslatorPanelProps) {
  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");
  const [from, setFrom] = useState<LanguageCode>("vi");
  const [to, setTo] = useState<LanguageCode>("ko");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionBaseTextRef = useRef("");
  const recognitionFinalTextRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceModeRef = useRef<VoiceMode | null>(null);
  const voiceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canTranslate = useMemo(
    () => sourceText.trim().length > 0 && from !== to && !loading,
    [sourceText, from, to, loading],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function speakText(text: string, language: LanguageCode) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const normalized = text.trim();
    if (!normalized) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.lang = toSpeechLocale(language);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

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
      const translatedText = data.translatedText ?? "Unable to translate.";
      setTranslated(translatedText);
      if (autoSpeak && response.ok) {
        speakText(translatedText, to);
      }
      if (response.ok) {
        const key = `kbridge_translate_usage_${userId}`;
        const current = Number(localStorage.getItem(key) ?? "0");
        localStorage.setItem(key, String((Number.isFinite(current) ? current : 0) + 1));
      }
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

  async function transcribeAudioWithValsea(audioBlob: Blob) {
    const ext = audioBlob.type.includes("wav")
      ? "wav"
      : audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a")
        ? "m4a"
        : "webm";
    const audioFile = new File([audioBlob], `translator-voice.${ext}`, {
      type: audioBlob.type || "audio/webm",
    });
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("language", from === "vi" ? "vi" : "en");

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

  function startBrowserVoiceInput() {
    const voiceWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const RecognitionCtor =
      voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setVoiceHint("Trinh duyet chua ho tro voice input.");
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = toSpeechLocale(from);
    recognition.interimResults = true;
    recognition.continuous = false;
    voiceModeRef.current = "browser";
    recognitionBaseTextRef.current = sourceText.trim();
    recognitionFinalTextRef.current = "";
    setVoiceHint(`Dang nghe ${from.toUpperCase()}...`);

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) continue;
        if (result.isFinal) {
          recognitionFinalTextRef.current =
            `${recognitionFinalTextRef.current} ${transcript}`.trim();
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }

      const merged = [
        recognitionBaseTextRef.current,
        recognitionFinalTextRef.current,
        interim,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      setSourceText(merged);
    };

    recognition.onerror = (event) => {
      const errorMap: Record<string, string> = {
        "not-allowed": "Ban can cho phep microphone de dung voice.",
        "audio-capture": "Khong tim thay microphone tren thiet bi.",
        "no-speech": "Khong nghe thay giong noi. Thu noi ro hon.",
      };
      setVoiceHint(errorMap[event.error] ?? "Voice input gap loi. Thu lai sau.");
      setIsListening(false);
      voiceModeRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceHint((prev) => (prev.startsWith("Dang nghe") ? "Da nhan voice input." : prev));
      voiceModeRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function startValseaVoiceInput() {
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
      recognitionBaseTextRef.current = sourceText.trim();
      setVoiceHint(`Dang nghe ${from.toUpperCase()}...`);
      setIsListening(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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
        voiceModeRef.current = null;

        if (chunks.length === 0) {
          startBrowserVoiceInput();
          return;
        }

        try {
          const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
          const transcript = await transcribeAudioWithValsea(blob);
          const merged = [recognitionBaseTextRef.current, transcript]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          setSourceText(merged);
          setVoiceHint("Da nhan voice input.");
        } catch {
          startBrowserVoiceInput();
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        voiceModeRef.current = null;
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
      return;
    }

    if (from === "ko") {
      setVoiceHint("Voice input with VALSEA currently supports VI/EN. Switching to browser fallback for KO.");
      startBrowserVoiceInput();
      return;
    }

    const startedWithValsea = await startValseaVoiceInput();
    if (!startedWithValsea) {
      startBrowserVoiceInput();
    }
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

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onTranslate} disabled={!canTranslate}>
            {loading ? "Translating..." : "Translate"}
          </Button>
          <Button
            type="button"
            variant={isListening ? "default" : "outline"}
            onClick={onVoiceInputClick}
            disabled={loading}
            title={`Voice input (${from.toUpperCase()})`}
          >
            {isListening ? <Square className="size-4" /> : <Mic className="size-4" />}
            {isListening ? "Stop voice" : "Voice input"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => speakText(sourceText, from)}
            disabled={!sourceText.trim()}
            title="Nghe van ban nguon"
          >
            <Volume2 className="size-4" />
            Listen source
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => speakText(translated, to)}
            disabled={!translated.trim()}
            title="Nghe ban dich"
          >
            <Volume2 className="size-4" />
            Listen translated
          </Button>
          <Button
            type="button"
            variant={autoSpeak ? "default" : "outline"}
            onClick={() => setAutoSpeak((prev) => !prev)}
            title="Tu dong doc ban dich sau khi Translate"
          >
            <Volume2 className="size-4" />
            {autoSpeak ? "Auto speak: ON" : "Auto speak: OFF"}
          </Button>
        </div>

        {voiceHint && <p className="text-xs text-slate-500">{voiceHint}</p>}

        <Textarea value={translated} readOnly className="min-h-32 bg-slate-50" />
      </CardContent>
    </Card>
  );
}
