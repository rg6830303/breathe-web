import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Coffee,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { LiveAvailability } from "@/components/live-availability";
import { Nav } from "@/components/nav";
import { NoticeBoard } from "@/components/notice-board";
import { PaddleMark } from "@/components/logo";
import { CTABand, Container, SectionHeading } from "@/components/ui";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";
import { site } from "@/lib/site";
import type { Notice } from "@/lib/types";

// Motion Imports
import * as React from "react";
import { HomeMotion } from "@/components/home-motion";

async function getNotices(): Promise<Notice[]> {
  const fallback: Notice[] = [
    { id: 1, title: "Tonight: prime-time courts filling fast", content: "7–9 PM slots on Courts 1 & 2 are nearly gone — lock yours in now.", type: "daily", created_at: "", updated_at: "" },
    { id: 2, title: "Weekend Doubles Ladder", content: "Saturday social ladder, all levels welcome. Registration closes Friday 6 PM.", type: "weekly", created_at: "", updated_at: "" },
    { id: 3, title: "Breathe Monthly Open", content: "Open & beginner brackets with cash prizes. Early-bird passes now available.", type: "monthly", created_at: "", updated_at: "" },
  ];
  if (!hasSupabaseEnv()) return fallback;
  try {
    const supabase = getSupabaseService();
    const fromNew = await supabase
      .from("notices")
      .select("id,title,body,category,created_at")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (!fromNew.error && fromNew.data?.length) {
      return fromNew.data.map((row, idx) => ({
        id: idx + 1,
        title: row.title,
        content: row.body ?? "",
        type: row.category as Notice["type"],
        created_at: row.created_at,
        updated_at: row.created_at,
      }));
    }
    const fromLegacy = await supabase.from("notice_board").select("*").order("created_at", { ascending: false });
    if (fromLegacy.error) throw fromLegacy.error;
    return fromLegacy.data?.length ? fromLegacy.data : fallback;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const notices = await getNotices();

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        <HomeMotion notices={notices} />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
