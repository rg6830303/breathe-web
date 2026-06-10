"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, CalendarDays } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui";
import { clearCart } from "@/lib/cart";

export default function BookingConfirmedPage() {
  // Belt-and-braces: ensure the cart is cleared once we reach confirmation.
  useEffect(() => {
    clearCart();
  }, []);

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen-safe bg-brand-50/30 dark:bg-ink">
        <Container className="py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="card-sport mx-auto max-w-md p-8 text-center sm:p-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime"
            >
              <Check className="h-8 w-8 text-ink" />
            </motion.div>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white">
              Booking confirmed!
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slatey dark:text-white/60">
              Your court is reserved. A confirmation email with your invoice is on its way, and your
              session now shows in your dashboard. See you on the court! 🎾
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="btn-primary w-full justify-center sm:w-auto">
                <CalendarDays className="h-4 w-4" /> View my bookings
              </Link>
              <Link href="/book" className="btn-outline w-full justify-center sm:w-auto">
                Book another <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
