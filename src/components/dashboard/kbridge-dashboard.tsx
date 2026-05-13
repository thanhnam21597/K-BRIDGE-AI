"use client";

import { useEffect, useState } from "react";
import { ChecklistPanel } from "@/components/dashboard/checklist-panel";
import { CulturalCoach } from "@/components/dashboard/cultural-coach";
import { DailyTipsPanel } from "@/components/dashboard/daily-tips-panel";
import { RolePlayPanel } from "@/components/dashboard/role-play-panel";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TranslatorPanel } from "@/components/dashboard/translator-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_USER_PROFILE } from "@/lib/onboarding";
import { FeatureKey } from "@/lib/types";

const AUTH_STORAGE_KEY = "kbridge_demo_auth";

export function KBridgeDashboard() {
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("cultural-coach");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (auth) {
      setCurrentUserId(auth);
      setIsAuthed(true);
    }
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
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="cultural-coach">Coach</TabsTrigger>
            <TabsTrigger value="translator">Translator</TabsTrigger>
            <TabsTrigger value="role-play">Role-play</TabsTrigger>
            <TabsTrigger value="daily-tips">Tips</TabsTrigger>
          </TabsList>
          <TabsContent value="cultural-coach">
            <CulturalCoach userId={currentUserId || "demo-user"} />
          </TabsContent>
          <TabsContent value="translator">
            <TranslatorPanel />
          </TabsContent>
          <TabsContent value="role-play">
            <RolePlayPanel />
          </TabsContent>
          <TabsContent value="daily-tips">
            <DailyTipsPanel />
          </TabsContent>
        </Tabs>
      </main>

      <section>
        <ChecklistPanel userId={currentUserId || "demo-user"} />
      </section>
    </div>
  );
}
