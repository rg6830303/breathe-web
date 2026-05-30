/** Small uppercase label rendered above section headings — paired with the
 *  small dot for visual rhythm. `light` swaps colours for use on a dark
 *  background (hero gradients). */
export function SectionLabel({
  children,
  light = false,
  className = "",
}: {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] ${
        light ? "text-brand-200" : "text-brand-600"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-brand-200" : "bg-brand-600"}`} />
      {children}
    </span>
  );
}
