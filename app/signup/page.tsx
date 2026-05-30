import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <>
      <Nav />
      <main className="min-h-[calc(100vh-200px)] bg-brand-50/40 px-4 py-12 sm:py-16">
        <Suspense fallback={<div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-3xl bg-white" />}>
          <SignupForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
