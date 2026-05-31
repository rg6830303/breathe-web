import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Tailwind,
} from "@react-email/components";

type Props = {
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export default function PasswordReset({ customerName, resetUrl, expiresInMinutes }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Breathe Pickleball password</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="bg-white rounded-2xl my-8 mx-auto max-w-xl p-8 border border-gray-100 shadow-sm">
            <Section className="text-center pb-6">
              <Heading className="text-2xl font-bold text-gray-900 m-0">Reset your password</Heading>
              <Text className="text-gray-600 mt-2">Hi {customerName}, we received a request to reset your password.</Text>
            </Section>
            <Hr className="border-gray-200" />
            <Section className="py-6 text-center">
              <Text className="text-sm text-gray-700">Click below to choose a new password. This link expires in {expiresInMinutes} minutes.</Text>
              <Button
                href={resetUrl}
                className="bg-blue-600 text-white rounded-full px-8 py-3 font-semibold text-center text-sm inline-block mt-3"
              >
                Reset password
              </Button>
              <Text className="text-xs text-gray-400 mt-4 break-all">
                Or copy this link: {resetUrl}
              </Text>
            </Section>
            <Hr className="border-gray-200" />
            <Section className="pt-6">
              <Text className="text-xs text-gray-500 text-center m-0 leading-relaxed">
                Didn&apos;t request this? You can ignore this email — your password won&apos;t change.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
