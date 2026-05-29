"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/session";
import { getSupabaseAnon } from "@/lib/supabase";

function hasAnonEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function clean(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function err(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function userSignup(formData: FormData) {
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  const next = clean(formData.get("next")) || "/dashboard";

  if (!name || !isEmail(email) || password.length < 6) {
    err("/signup", "Enter your name, a valid email, and a password of at least 6 characters.");
  }

  if (hasAnonEnv()) {
    const { error } = await getSupabaseAnon().auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) err("/signup", error.message);
  }

  await createSession({ email, name, role: "player" });
  redirect(next);
}

export async function userLogin(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  const next = clean(formData.get("next")) || "/dashboard";

  if (!isEmail(email) || !password) {
    err("/login", "Enter a valid email and password.");
  }

  let name = email.split("@")[0];
  if (hasAnonEnv()) {
    const { data, error } = await getSupabaseAnon().auth.signInWithPassword({ email, password });
    if (error) err("/login", error.message);
    name = (data.user?.user_metadata?.full_name as string) || name;
  }

  await createSession({ email, name, role: "player" });
  redirect(next);
}

export async function adminLogin(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  if (!email || !password) {
    err("/admin/login", "Enter the owner email and password.");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  let ok = false;
  if (adminEmail && adminPassword) {
    // Production: credentials must match configured owner account.
    ok = email === adminEmail && password === adminPassword;
  } else if (adminPassword) {
    ok = password === adminPassword;
  } else {
    // Demo mode (no owner credentials configured): accept the documented demo password.
    ok = password === "breathe-admin";
  }

  if (!ok) {
    err("/admin/login", "Invalid owner credentials.");
  }

  await createSession({ email, name: "Club Owner", role: "admin" });
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
