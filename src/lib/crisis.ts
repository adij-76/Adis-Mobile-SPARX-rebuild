/**
 * Crisis / safety net. For a recovery app this is the single most important
 * always-on affordance: it must work regardless of backend state (audit F-H3).
 *
 * `CRISIS_RESOURCES` powers the "Get help now" screen; `isCrisisMessage` +
 * `CRISIS_REPLY` give Sparky a LOCAL crisis path so a user in distress is never
 * left with a canned grounding offer when the AI webhook is down or unconfigured.
 *
 * US resources. If the app expands internationally, branch these by locale.
 */
export type CrisisResource = {
  name: string;
  detail: string;
  /** Ionicons name. */
  icon: string;
  /** A tel: or sms: URL opened via Linking. */
  href: string;
  /** Short button label, e.g. "Call" / "Text". */
  action: string;
};

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'Emergency',
    detail: "If you're in immediate danger, call 911.",
    icon: 'alert-circle',
    href: 'tel:911',
    action: 'Call 911',
  },
  {
    name: '988 Suicide & Crisis Lifeline',
    detail: '24/7, free and confidential — call or text 988.',
    icon: 'call',
    href: 'tel:988',
    action: 'Call 988',
  },
  {
    name: 'Text the 988 Lifeline',
    detail: 'Prefer texting? Text 988 to reach a crisis counselor.',
    icon: 'chatbubble-ellipses',
    href: 'sms:988',
    action: 'Text 988',
  },
  {
    name: 'SAMHSA National Helpline',
    detail: 'Free, confidential treatment referral & information, 24/7.',
    icon: 'medkit',
    href: 'tel:18006624357',
    action: 'Call 1-800-662-4357',
  },
  {
    name: 'Crisis Text Line',
    detail: 'Text HOME to 741741 to connect with a crisis counselor.',
    icon: 'chatbubbles',
    href: 'sms:741741&body=HOME',
    action: 'Text 741741',
  },
];

// Phrases that signal acute risk (self-harm, suicidality, overdose). Deliberately
// high-signal to avoid crying wolf on ordinary "tough day" language, which
// Sparky already handles warmly. Substring match on a lowercased message.
const CRISIS_PATTERNS = [
  'kill myself',
  'killing myself',
  'want to die',
  'wanna die',
  'end my life',
  'end it all',
  'suicide',
  'suicidal',
  'better off dead',
  'no reason to live',
  "don't want to be here anymore",
  'dont want to be here anymore',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'cut myself',
  'overdose',
  'od on',
  'take all my pills',
];

/** True when a message signals acute crisis and should surface help immediately. */
export function isCrisisMessage(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS_PATTERNS.some((p) => t.includes(p));
}

/** Sparky's local crisis reply — shown when the AI backend can't (down or
 *  unconfigured) so the safety net never depends on the network. */
export const CRISIS_REPLY =
  "I'm really glad you reached out, and I want to make sure you're safe. I'm not able to help with a crisis myself, but people who can are available right now:\n\n" +
  '• Call or text 988 — the Suicide & Crisis Lifeline (24/7, free, confidential)\n' +
  '• Call 911 if you’re in immediate danger\n' +
  '• SAMHSA Helpline: 1-800-662-4357\n\n' +
  'These lines are free, confidential, and open 24/7. You don’t have to go through this alone.';
