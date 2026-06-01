import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Button, Hr, Tailwind } from '@react-email/components'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://breathe-web-six.vercel.app";

type Props = {
  customerName: string;
  bookingId: string;
  slotDate: string;
  slotTime: string;
  duration: string;
  amount: number;
  venueAddress: string;
  bookingUrl: string;
}

export default function BookingConfirmation({
  customerName,
  bookingId,
  slotDate,
  slotTime,
  duration,
  amount,
  venueAddress,
  bookingUrl
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Booking confirmed at Breathe Pickleball</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="bg-white rounded-2xl my-8 mx-auto max-w-xl p-8 border border-gray-100 shadow-sm">
            <Section className="text-center pb-4">
              <Img src={`${SITE_URL}/icons/icon-192.png`} alt="Breathe Pickleball" width="64" height="64" className="mx-auto rounded-2xl" />
            </Section>
            <Section className="text-center pb-6">
              <Heading className="text-3xl font-bold text-gray-900 m-0">You're booked! 🎾</Heading>
              <Text className="text-gray-600 mt-2">See you on court, {customerName}.</Text>
            </Section>
            <Hr className="border-gray-200" />
            <Section className="py-6">
              <Text className="text-xs uppercase tracking-widest text-blue-600 m-0 font-bold">Booking Details</Text>
              <Heading className="text-xl font-bold text-gray-900 mt-2 mb-4">{slotDate}</Heading>
              <Text className="text-lg text-gray-800 m-0">⏰ {slotTime}</Text>
              <Text className="text-sm text-gray-600 mt-1">{duration}</Text>
              <Text className="text-2xl font-bold text-blue-600 mt-4 mb-0">₹{amount}</Text>
              <Text className="text-xs text-gray-400 mt-1 m-0">Reference: {bookingId}</Text>
            </Section>
            <Hr className="border-gray-200" />
            <Section className="py-6">
              <Text className="text-sm font-semibold text-gray-700 m-0">📍 Venue</Text>
              <Text className="text-sm text-gray-600 mt-1">{venueAddress}</Text>
            </Section>
            <Section className="text-center pt-4">
              <Button href={bookUrlFallback(bookingUrl)} className="bg-blue-600 text-white rounded-full px-8 py-3 font-semibold text-center text-sm inline-block">
                View Booking
              </Button>
            </Section>
            <Hr className="border-gray-200" />
            <Section className="pt-6">
              <Text className="text-xs text-gray-500 text-center m-0 leading-relaxed">
                Free cancellation up to 4 hours before your slot. Questions? Reply to this email or WhatsApp +91 74390 10356.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Fallback helper to prevent any potential undefined href issues
function bookUrlFallback(url?: string): string {
  return url || "https://breathe-web-six.vercel.app/dashboard";
}
