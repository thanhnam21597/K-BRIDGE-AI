"use client";

import { useEffect, useRef, useState } from "react";
import { ChecklistPanel } from "@/components/dashboard/checklist-panel";
import { CulturalCoach } from "@/components/dashboard/cultural-coach";
import { DemoFlowPanel } from "@/components/dashboard/demo-flow-panel";
import { OnboardingKpiPanel } from "@/components/dashboard/onboarding-kpi-panel";
import { RolePlayPanel } from "@/components/dashboard/role-play-panel";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TranslatorPanel } from "@/components/dashboard/translator-panel";
import { AskWhoPanel } from "@/components/dashboard/ask-who-panel";
import { WeeklyTimelinePanel } from "@/components/dashboard/weekly-timeline-panel";
import { FlashcardsStudio } from "@/components/flashcards/flashcards-studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AskWhoScenarioId,
  DEFAULT_ASK_WHO_SCENARIO_ID,
  getAskWhoScenarioShortLabel,
} from "@/lib/ask-who";
import { DEFAULT_USER_PROFILE } from "@/lib/onboarding";
import { FeatureKey } from "@/lib/types";

export const AUTH_STORAGE_KEY = "kbridge_demo_auth";

type KBridgeDashboardProps = {
  forceLogin?: boolean;
  prefillEmail?: string;
  prefillPassword?: string;
  onBackToLanding?: () => void;
};

export function KBridgeDashboard({
  forceLogin = false,
  prefillEmail = "",
  prefillPassword = "",
  onBackToLanding,
}: KBridgeDashboardProps = {}) {
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("demo-flow");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState(prefillPassword);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [askWhoScenarioId, setAskWhoScenarioId] = useState<AskWhoScenarioId>(
    DEFAULT_ASK_WHO_SCENARIO_ID,
  );
  const [deepLinkToastText, setDeepLinkToastText] = useState("");
  const deepLinkToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (forceLogin) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsAuthed(false);
      return;
    }

    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (auth) {
      setCurrentUserId(auth);
      setIsAuthed(true);
    }
  }, [forceLogin]);

  useEffect(() => {
    return () => {
      if (deepLinkToastTimerRef.current) {
        clearTimeout(deepLinkToastTimerRef.current);
      }
    };
  }, []);

  function handleDemoLogin() {
    if (!email.trim() || !password.trim()) return;
    const normalizedUserId = email.trim().toLowerCase();
    localStorage.setItem(AUTH_STORAGE_KEY, normalizedUserId);
    setCurrentUserId(normalizedUserId);
    setIsAuthed(true);
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>K-Bridge AI</CardTitle>
            <CardDescription>Demo sign-in for onboarding assistant access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button className="w-full" onClick={handleDemoLogin}>
              Continue to Dashboard
            </Button>
            {onBackToLanding && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onBackToLanding}
              >
                Back to Landing
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr_360px] lg:p-6">
      <Sidebar
        user={DEFAULT_USER_PROFILE}
        activeFeature={activeFeature}
        onSelectFeature={setActiveFeature}
      />

      <main className="space-y-4">
        <Tabs value={activeFeature} onValueChange={(value) => setActiveFeature(value as FeatureKey)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <TabsTrigger
              value="demo-flow"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Demo Flow
            </TabsTrigger>
            <TabsTrigger
              value="cultural-coach"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Coach
            </TabsTrigger>
            <TabsTrigger
              value="onboarding-kpi"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Onboarding KPI
            </TabsTrigger>
            <TabsTrigger
              value="translator"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Translator
            </TabsTrigger>
            <TabsTrigger
              value="role-play"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Role-play
            </TabsTrigger>
            <TabsTrigger
              value="flashcards"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Flash Cards
            </TabsTrigger>
            <TabsTrigger
              value="weekly-timeline"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Weekly Timeline
            </TabsTrigger>
            <TabsTrigger
              value="ask-who"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
            >
              Ask Who
            </TabsTrigger>
          </TabsList>
          <TabsContent value="demo-flow">
            <DemoFlowPanel onGoToFeature={setActiveFeature} />
          </TabsContent>
          <TabsContent value="cultural-coach">
            <CulturalCoach
              userId={currentUserId || "demo-user"}
              onAskWhoDeepLink={(scenarioId) => {
                setAskWhoScenarioId(scenarioId);
                setActiveFeature("ask-who");
                setDeepLinkToastText(`Da mo Ask Who: ${getAskWhoScenarioShortLabel(scenarioId)}`);
                if (deepLinkToastTimerRef.current) {
                  clearTimeout(deepLinkToastTimerRef.current);
                }
                deepLinkToastTimerRef.current = setTimeout(() => {
                  setDeepLinkToastText("");
                }, 2200);
              }}
            />
          </TabsContent>
          <TabsContent value="onboarding-kpi">
            <OnboardingKpiPanel userId={currentUserId || "demo-user"} />
          </TabsContent>
          <TabsContent value="translator">
            <TranslatorPanel userId={currentUserId || "demo-user"} />
          </TabsContent>
          <TabsContent value="role-play">
            <RolePlayPanel />
          </TabsContent>
          <TabsContent value="flashcards">
            <FlashcardsStudio userId={currentUserId || "demo-user"} />
          </TabsContent>
          <TabsContent value="weekly-timeline">
            <WeeklyTimelinePanel userId={currentUserId || "demo-user"} />
          </TabsContent>
          <TabsContent value="ask-who">
            <AskWhoPanel
              selectedScenarioId={askWhoScenarioId}
              onSelectedScenarioIdChange={setAskWhoScenarioId}
            />
          </TabsContent>
        </Tabs>
      </main>

      <section>
        <ChecklistPanel userId={currentUserId || "demo-user"} />
      </section>

      {deepLinkToastText && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-lg">
          {deepLinkToastText}
        </div>
      )}
    </div>
  );
}
