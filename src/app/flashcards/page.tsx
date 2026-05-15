"use client";

import { useEffect, useState } from "react";
import { FlashcardsStudio } from "@/components/flashcards/flashcards-studio";
import { AUTH_STORAGE_KEY } from "@/components/dashboard/kbridge-dashboard";

export default function FlashcardsPage() {
  const [userId, setUserId] = useState("demo-user");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) setUserId(stored);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6">
      <FlashcardsStudio userId={userId} />
    </main>
  );
}
