import { BookingGrid } from "@/components/booking-grid";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { getSlotsForDate } from "@/lib/slots";

export default async function BookPage() {
  const date = new Date().toISOString().slice(0, 10);
  const slots = await getSlotsForDate(date);
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <BookingGrid initialDate={date} initialSlots={slots} />
      </main>
      <Footer />
    </>
  );
}
