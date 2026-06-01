import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <>
      <Nav />
      <AuthLayout>
        <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-3xl bg-white" />}>
          <LoginForm />
        </Suspense>
      </AuthLayout>
      <Footer />
    </>
  );
}
