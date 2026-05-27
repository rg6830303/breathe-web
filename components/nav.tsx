import Link from "next/link";
import { Activity, CalendarDays, LayoutDashboard, Shield } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/book", label: "Book", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-midnight/82 backdrop-blur-xl">
      <div className="overflow-hidden bg-volt py-2 text-midnight">
        <div className="flex w-max animate-ticker gap-10 whitespace-nowrap text-xs font-black uppercase tracking-[0.16em]">
          <span>Kaikhali, Kolkata | +91 74390 10356</span>
          <span>Live half-hour booking matrix online</span>
          <span>Owner sheet sync and alerts enabled</span>
          <span>Kaikhali, Kolkata | +91 74390 10356</span>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="font-display text-2xl font-black italic text-court">
          BREATHE PB
        </Link>
        <div className="flex items-center gap-1 md:gap-3">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-slate-300 transition hover:bg-court/12 hover:text-volt"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
