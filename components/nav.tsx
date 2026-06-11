"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, LogOut, MapPin, Menu, Phone, Shield, User, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, site } from "@/lib/site";
import { motion, AnimatePresence } from "framer-motion";

type Account = { email: string; name: string; role: "user" | "admin" } | null;

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [account, setAccount] = useState<Account>(null);
  const [loaded, setLoaded] = useState(false);

  async function handleLogout() {
    const endpoint = account?.role === "admin" ? "/api/admin/auth/logout" : "/api/auth/logout";
    await fetch(endpoint, { method: "POST" });
    // Hard redirect so cleared cookie is picked up server-side immediately
    window.location.href = "/";
  }

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (active) setAccount(d.user ?? null);
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      {/* Brand ticker — tape-stripe accented info bar */}
      <div className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="tape-stripe absolute left-0 top-0 h-full w-1.5 opacity-90"
        />
        <div className="no-scrollbar flex w-max animate-ticker items-center gap-12 whitespace-nowrap py-2 pl-6 text-[0.68rem] font-extrabold uppercase tracking-[0.22em]">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex items-center gap-12">
              <span className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-lime" /> {site.phoneDisplay}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-lime" /> {site.headerAddress}
              </span>
              <span className="text-white/60">{site.hoursShort}</span>
              <span className="text-white/60">{site.courts} professional courts</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main nav bar — crisp solid, no glass */}
      <div
        className={`border-b transition-colors duration-200 ${
          scrolled
            ? "border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-ink"
            : "border-transparent bg-white dark:bg-ink"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          {/* Desktop links */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-lg px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide transition-colors duration-150 ${
                    active
                      ? "text-brand dark:text-lime"
                      : "text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0.5 left-4 right-4 h-[3px] rounded-full bg-lime"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {loaded && account ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  href={account.role === "admin" ? "/admin" : "/dashboard"}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink/10 bg-transparent px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-lime dark:hover:text-lime"
                >
                  {account.role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  <span className="max-w-[120px] truncate">{account.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/10 text-ink transition hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-lime dark:hover:text-lime"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              loaded && (
                <Link
                  href="/login"
                  className="hidden rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink/60 transition hover:text-brand dark:text-white/60 dark:hover:text-white lg:inline-flex"
                >
                  Log in
                </Link>
              )
            )}

            {/* Book CTA — chunky btn-accent style */}
            <Link
              href="/book"
              className="btn-accent hidden sm:inline-flex"
            >
              Book a Slot <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/10 text-ink transition hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-lime dark:hover:text-lime lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/60"
              onClick={() => setOpen(false)}
            />

            {/* Drawer Panel — solid ink, no glass */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col justify-between overflow-y-auto bg-white p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] shadow-2xl dark:bg-ink"
            >
              {/* Tape accent at top */}
              <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />

              <div className="mt-3">
                <div className="mb-5 flex items-center justify-between border-b-2 border-ink/8 pb-4 dark:border-white/10">
                  <Logo />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/10 text-ink dark:border-white/15 dark:text-white"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-1">
                  {navLinks.map((link, idx) => {
                    const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          href={link.href}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition-colors ${
                            active
                              ? "bg-lime text-ink"
                              : "text-ink hover:bg-ink/5 dark:text-white dark:hover:bg-white/10"
                          }`}
                        >
                          {link.label}
                          <ArrowRight className="h-4 w-4 opacity-50" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t-2 border-ink/8 pt-5 dark:border-white/10">
                <Link
                  href="/book"
                  className="btn-accent flex items-center justify-center gap-2 w-full"
                >
                  Book a Slot <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="grid gap-2">
                  {account ? (
                    <>
                      <Link
                        href={account.role === "admin" ? "/admin" : "/dashboard"}
                        className="flex items-center justify-between rounded-xl border-2 border-ink/10 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-ink dark:border-white/10 dark:text-white"
                      >
                        <span className="flex items-center gap-2">
                          {account.role === "admin" ? <Shield className="h-4 w-4 text-brand" /> : <LayoutDashboard className="h-4 w-4 text-brand" />}
                          {account.role === "admin" ? "Owner console" : "My dashboard"}
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/10 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-ink dark:border-white/10 dark:text-white"
                      >
                        <LogOut className="h-4 w-4" /> Log out ({account.name})
                      </button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        className="flex items-center justify-center rounded-xl border-2 border-ink/10 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-ink dark:border-white/10 dark:text-white"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        className="btn-primary flex items-center justify-center text-xs"
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>

                <a
                  href={site.phoneHref}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-ink/10 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-ink dark:border-white/10 dark:text-white"
                >
                  <Phone className="h-4 w-4 text-brand" /> {site.phoneDisplay}
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
