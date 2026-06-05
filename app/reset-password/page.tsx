import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen-safe bg-ink">
        {/* Tape stripe top accent */}
        <div aria-hidden className="tape-stripe h-1.5 w-full" />
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
          {/* Court-line background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 top-1/4 h-48 w-48 rotate-12 rounded-[2.5rem] bg-brand/20" />
          <div aria-hidden className="pointer-events-none absolute -left-12 bottom-12 h-40 w-40 -rotate-12 rounded-[2rem] bg-lime/10" />
          <Suspense
            fallback={
              <div className="mx-auto h-72 w-full max-w-md animate-pulse rounded-3xl border-2 border-white/10 bg-[#111c38]" />
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
