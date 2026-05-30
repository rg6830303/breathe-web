import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

type Props = {
  playerName: string;
  courtId: number;
  window: string;
  total: number;
};

export function BookingConfirmationEmail({ playerName, courtId, window, total }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Breathe Pickleball booking confirmed</Preview>
      <Body style={{ background: "#0A0F1D", color: "#D4E4FA", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "32px", maxWidth: "560px" }}>
          <Heading style={{ color: "#0EA5E9" }}>Court booked</Heading>
          <Text>Hi {playerName}, your Breathe Pickleball reservation is confirmed.</Text>
          <Section style={{ border: "1px solid #2A66FF", borderRadius: "8px", padding: "16px" }}>
            <Text>Court: {courtId}</Text>
            <Text>Window: {window}</Text>
            <Text>Total: INR {total}</Text>
          </Section>
          <Hr />
          <Text style={{ color: "#94A3B8" }}>Arrive 10 minutes early for check-in and warm-up.</Text>
        </Container>
      </Body>
    </Html>
  );
}
