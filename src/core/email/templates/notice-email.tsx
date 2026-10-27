import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
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
  options,
  optionsTitle,
  footer,
  unsubscribeUrl,
}: {
  appName: string;
  logoUrl?: string;
  preview: string;
  heading: string;
  paragraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
  /** Stacked link buttons (e.g. one-click survey answers). */
  options?: { text: string; url: string }[];
  /** Line shown above `options` (they come after the call-to-action). */
  optionsTitle?: string;
  footer?: string;
  /** Rendered as an "Unsubscribe" link under the footer. */
  unsubscribeUrl?: string;
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
            {ctaText && ctaUrl ? (
              <Section style={styles.buttonWrap}>
                <Button href={ctaUrl} style={styles.button}>
                  {ctaText}
                </Button>
              </Section>
            ) : null}
            {optionsTitle && options?.length ? (
              <Text style={styles.p}>{optionsTitle}</Text>
            ) : null}
            {options?.length ? (
              <Section style={optionStyles.list}>
                {options.map((option) => (
                  <Button
                    key={option.url}
                    href={option.url}
                    style={optionStyles.option}
                  >
                    {option.text}
                  </Button>
                ))}
              </Section>
            ) : null}
            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
            {unsubscribeUrl ? (
              <Text style={styles.footer}>
                <Link href={unsubscribeUrl} style={styles.footer}>
                  Unsubscribe
                </Link>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const optionStyles: Record<string, React.CSSProperties> = {
  list: { margin: '14px 0 6px' },
  option: {
    display: 'block',
    margin: '0 0 8px',
    padding: '11px 14px',
    border: '1px solid rgba(15, 23, 42, 0.14)',
    borderRadius: 10,
    color: '#111827',
    fontSize: 14,
    textDecoration: 'none',
  },
};
