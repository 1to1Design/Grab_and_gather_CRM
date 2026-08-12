const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function extractPhone(text: string): string | undefined {
  const match = text.match(PHONE_RE);
  return match?.[0];
}

export function extractEmail(text: string): string | undefined {
  const match = text.match(EMAIL_RE);
  return match?.[0];
}
