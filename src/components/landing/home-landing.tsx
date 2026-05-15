"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckSquare,
  Globe2,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import {
  KBridgeDashboard,
} from "@/components/dashboard/kbridge-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURE_CARDS = [
  {
    icon: CheckSquare,
    title: "Adaptive 30-day Checklist",
    description:
      "Personalized onboarding tasks by role, company context, and cultural adaptation milestones.",
  },
  {
    icon: Bot,
    title: "Cultural Coach Assistant",
    description:
      "Vietnamese-first AI guidance to navigate Korean workplace communication with confidence.",
  },
  {
    icon: Globe2,
    title: "Business Translator",
    description:
      "VN ↔ EN ↔ KR translation for meetings, reports, and formal workplace communication.",
  },
  {
    icon: MessageSquareQuote,
    title: "Role-play Simulator",
    description:
      "Practice real remote scenarios: report delay, ask for help, feedback sessions, and weekly sync.",
  },
] as const;

export function HomeLanding() {
  const [demoStarted, setDemoStarted] = useState(false);

  function onTryDemo() {
    setDemoStarted(true);
  }

  if (demoStarted) {
    return (
      <KBridgeDashboard
        forceLogin
        prefillEmail="demo@kbridge.ai"
        prefillPassword="demo123"
        onBackToLanding={() => setDemoStarted(false)}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-5">
          <Badge className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
            <Sparkles className="mr-1 size-3.5" />
            Remote Onboarding for Korean Teams
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 lg:text-6xl">
            K-Bridge AI:
            <span className="block text-blue-600">
              onboard Vietnamese talent with confidence.
            </span>
          </h1>
          <p className="max-w-xl text-base text-slate-600 lg:text-lg">
            A full-stack onboarding assistant that helps Vietnamese professionals
            adapt faster to Korean workplace culture, communication style, and
            remote collaboration norms.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="rounded-xl px-6" onClick={onTryDemo}>
              Try Demo
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-sm text-slate-500">
              No sign-up required. Instant fake user demo.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden border-blue-100 shadow-lg shadow-blue-100/60">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-lg">Product Mockup</CardTitle>
            <CardDescription className="text-blue-100">
              Dashboard preview for investor and stakeholder pitch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 bg-white p-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Cultural Coach</p>
              <p className="mt-1 text-sm text-slate-800">
                &quot;How should I report delay to a Korean manager respectfully?&quot;
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Checklist Progress</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">67%</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">RAG KB Status</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">Seeded</p>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              VN ↔ EN ↔ KR translation + role-play simulator + daily coaching tips.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="rounded-2xl border-slate-200/80">
              <CardHeader className="space-y-2 pb-3">
                <div className="inline-flex w-fit rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
