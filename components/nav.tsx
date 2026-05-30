"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, LogOut, MapPin, Menu, Phone, Shield, User, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "@/app/actions/auth";
import { navLinks, site } from "@/lib/site";
import { motion, AnimatePresence } from "framer-motion";

type Account = { email: string; name: string; role: "player" | "admin" } | null;

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [account, setAccount] = useState<Account>(null);
  const [loaded, setLoaded] = useState(false);

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
      {/* Brand ticker */}
      <div className="brand-gradient overflow-hidden py-2 text-white">
        <div className="no-scrollbar flex w-max animate-ticker items-center gap-12 whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex items-center gap-12">
              <span className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> {site.phoneDisplay}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> {site.address.split(",").slice(-3).join(",").trim()}
              </span>
              <span>{site.hoursShort}</span>
              <span>{site.courts} professional courts</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`border-b transition-all ${
          scrolled
            ? "border-brand/10 bg-white/90 shadow-soft backdrop-blur-xl"
            : "border-transparent bg-white/70 backdrop-blur-md"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "text-brand" : "text-ink/70 hover:bg-brand/5 hover:text-brand"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-600"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {loaded && account ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  href={account.role === "admin" ? "/admin" : "/dashboard"}
                  className="inline-flex items-center gap-2 rounded-full border border-brand/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand/5"
                >
                  {account.role === "admin" ? <Shield className="h-4 w-4 text-brand" /> : <User className="h-4 w-4 text-brand" />}
                  <span className="max-w-[120px] truncate">{account.name}</span>
                </Link>
                <form action={logout}>
                  <button
                    aria-label="Log out"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/15 text-ink transition hover:bg-brand/5"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              loaded && (
                <Link
                  href="/login"
                  className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:text-brand lg:inline-flex"
                >
                  Log in
                </Link>
              )
            )}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(47,91,255,0.4)",
                  "0 0 0 10px rgba(47,91,255,0)",
                  "0 0 0 0 rgba(47,91,255,0)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
              className="hidden sm:inline-block rounded-full"
            >
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]"
              >
                Book a Slot <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand/15 text-ink lg:hidden"
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
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl z-50 flex flex-col justify-between p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between border-b border-brand/10 pb-4 mb-4">
                  <Logo />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/15 text-ink"
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
                          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition ${
                            active ? "bg-brand/10 text-brand" : "text-ink hover:bg-brand/5"
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

              <div className="mt-6 border-t border-brand/10 pt-4">
                <Link
                  href="/book"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-base font-bold text-white shadow-glow mb-4 animate-pulse-slow"
                >
                  Book a Slot <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="grid gap-2">
                  {account ? (
                    <>
                      <Link
                        href={account.role === "admin" ? "/admin" : "/dashboard"}
                        className="flex items-center justify-between rounded-2xl bg-brand/5 px-4 py-3 text-sm font-semibold text-ink"
                      >
                        <span className="flex items-center gap-2">
                          {account.role === "admin" ? <Shield className="h-4 w-4 text-brand" /> : <LayoutDashboard className="h-4 w-4 text-brand" />}
                          {account.role === "admin" ? "Owner console" : "My dashboard"}
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </Link>
                      <form action={logout}>
                        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/20 px-4 py-3 text-sm font-bold text-brand">
                          <LogOut className="h-4 w-4" /> Log out ({account.name})
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Link href="/login" className="flex items-center justify-center rounded-2xl border border-brand/20 px-4 py-3 text-sm font-bold text-brand">
                        Log in
                      </Link>
                      <Link href="/signup" className="flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white">
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>

                <a
                  href={site.phoneHref}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-brand/20 px-5 py-3 text-sm font-bold text-brand"
                >
                  <Phone className="h-4 w-4" /> {site.phoneDisplay}
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
