import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import { styles } from './verify-email';

/** Plain branded message with one call-to-action (welcome, refunds, …). */
export function NoticeEmail({
  appName,
  logoUrl,
  preview,
  heading,
  paragraphs,
  ctaText,
  ctaUrl,
  footer,
}: {
  appName: string;
  logoUrl?: string;
  preview: string;
  heading: string;
  paragraphs: string[];
  ctaText: string;
  ctaUrl: string;
  footer?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Section style={styles.accentBar} />
            <Section style={styles.brandRow}>
              {logoUrl ? (
                <Img
                  src={logoUrl}
                  width="40"
                  height="40"
                  alt={appName}
                  style={styles.cardLogo}
                />
              ) : null}
              <Text style={styles.cardBrand}>{appName}</Text>
            </Section>
            <Heading style={styles.h1}>{heading}</Heading>
            {paragraphs.map((text, i) => (
              <Text key={i} style={styles.p}>
                {text}
              </Text>
            ))}
            <Section style={styles.buttonWrap}>
              <Button href={ctaUrl} style={styles.button}>
                {ctaText}
              </Button>
            </Section>
            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
