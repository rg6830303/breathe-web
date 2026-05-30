import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type Props = {
  playerName: string | null;
  courtId: number;
  windowLabel: string;
  bookUrl: string;
};

export function WaitlistOpeningEmail({ playerName, courtId, windowLabel, bookUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>A slot opened at Breathe Pickleball — book now</Preview>
      <Body style={{ background: "#F1F5FF", color: "#0D1426", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "32px", maxWidth: "560px" }}>
          <Heading style={{ color: "#2F5BFF", marginTop: 0 }}>A slot just opened</Heading>
          <Text>
            Hi {playerName ?? "there"}, the Court {courtId} slot you wanted is free again. First to book wins it.
          </Text>
          <Section
            style={{
              border: "1px solid rgba(47,91,255,0.2)",
              borderRadius: "12px",
              padding: "16px",
              background: "#ffffff",
            }}
          >
            <Text style={{ margin: 0, fontWeight: 700 }}>Court {courtId}</Text>
            <Text style={{ margin: "4px 0 0 0", color: "#475569" }}>{windowLabel}</Text>
          </Section>
          <Section style={{ paddingTop: "20px" }}>
            <Button
              href={bookUrl}
              style={{ background: "#2F5BFF", color: "white", padding: "12px 20px", borderRadius: "999px", fontWeight: 700 }}
            >
              Book the slot →
            </Button>
          </Section>
          <Text style={{ color: "#475569", fontSize: "12px", marginTop: "20px" }}>
            You signed up for waitlist alerts for this slot. We'll stop emailing once you book or after 24 hours.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
