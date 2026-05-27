export function Footer() {
  return (
    <footer className="border-t border-line bg-[#010f1f] px-4 py-10 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="font-display text-3xl font-black italic text-volt">BREATHE PB</div>
        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Facility Rules</span>
          <span>Support</span>
        </div>
        <p className="text-sm text-slate-500">Engineered for competition.</p>
      </div>
    </footer>
  );
}
