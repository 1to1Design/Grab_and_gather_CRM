const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*(?:ext\.?|x)\s*\d{1,5})?/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Phrases a rep is likely to say right before a phone number or email, so we
// can grab the number that's actually being introduced instead of the first
// phone-shaped substring anywhere in a rambling note (which may not be the
// contact's own number).
const PHONE_TRIGGER_RE =
  /(?:cell\s*phone|cell|mobile|direct\s*line|office\s*number|business\s*number|work\s*number|phone\s*number|contact\s*number|telephone|phone)\s*(?:number)?\s*(?:is|was|:|-|,)?\s*/gi;

const EMAIL_TRIGGER_RE = /(?:email\s*address|e[-\s]?mail\s*address|e[-\s]?mail|email)\s*(?:is|was|:|-|,)?\s*/gi;

const TRIGGER_WINDOW = 40;

function extractAfterTrigger(text: string, triggerRe: RegExp, valueRe: RegExp): string | undefined {
  triggerRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = triggerRe.exec(text))) {
    const start = match.index + match[0].length;
    const window = text.slice(start, start + TRIGGER_WINDOW);
    const found = window.match(valueRe);
    if (found) return found[0];
  }
  return undefined;
}

export function extractPhone(text: string): string | undefined {
  return extractAfterTrigger(text, PHONE_TRIGGER_RE, PHONE_RE) ?? text.match(PHONE_RE)?.[0];
}

export function extractEmail(text: string): string | undefined {
  return extractAfterTrigger(text, EMAIL_TRIGGER_RE, EMAIL_RE) ?? text.match(EMAIL_RE)?.[0];
}
