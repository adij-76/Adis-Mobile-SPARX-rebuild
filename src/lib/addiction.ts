/**
 * Maps the `addiction` label from public.users to the verb/noun pair used in
 * the check-in question ("did you __verb__ or engage in your compulsive behavior?")
 * and in Sparky AI / recommendation personalisation. Falls back to a generic
 * phrase so the check-in always makes sense even before the view is populated.
 *
 * The DB `addiction` column is an integer FK to public.addictions. The
 * mobile_me view should JOIN to return the title text; ID_MAP handles the
 * numeric fallback in case the view hasn't been updated yet.
 */
const MAP: Record<string, { verb: string; noun: string }> = {
  alcohol:           { verb: 'drink',                        noun: 'drinking' },
  beer:              { verb: 'drink',                        noun: 'drinking' },
  wine:              { verb: 'drink',                        noun: 'drinking' },
  cannabis:          { verb: 'use cannabis',                 noun: 'cannabis use' },
  marijuana:         { verb: 'use marijuana',                noun: 'marijuana use' },
  weed:              { verb: 'use weed',                     noun: 'cannabis use' },
  opioids:           { verb: 'use opioids',                  noun: 'opioid use' },
  opiates:           { verb: 'use opiates',                  noun: 'opiate use' },
  heroin:            { verb: 'use heroin',                   noun: 'heroin use' },
  cocaine:           { verb: 'use cocaine',                  noun: 'cocaine use' },
  crack:             { verb: 'use crack',                    noun: 'crack use' },
  stimulants:        { verb: 'use stimulants',               noun: 'stimulant use' },
  meth:              { verb: 'use meth',                     noun: 'meth use' },
  methamphetamine:   { verb: 'use meth',                     noun: 'meth use' },
  benzodiazepines:   { verb: 'use benzos',                   noun: 'benzo use' },
  prescription:      { verb: 'misuse prescription medication', noun: 'prescription misuse' },
  gambling:          { verb: 'gamble',                       noun: 'gambling' },
  sex:               { verb: 'engage in compulsive sexual behavior', noun: 'sexual behavior' },
  porn:              { verb: 'view pornography',             noun: 'pornography use' },
  pornography:       { verb: 'view pornography',             noun: 'pornography use' },
  food:              { verb: 'binge eat',                    noun: 'binge eating' },
  eating:            { verb: 'binge eat',                    noun: 'binge eating' },
  shopping:          { verb: 'shop compulsively',            noun: 'compulsive shopping' },
  gaming:            { verb: 'game compulsively',            noun: 'compulsive gaming' },
  'social media':    { verb: 'use social media compulsively', noun: 'social media use' },
  nicotine:          { verb: 'use nicotine',                 noun: 'nicotine use' },
  smoking:           { verb: 'smoke',                        noun: 'smoking' },
  tobacco:           { verb: 'use tobacco',                  noun: 'tobacco use' },
  work:              { verb: 'overwork',                     noun: 'overworking' },
  codependency:      { verb: 'engage in codependent behavior', noun: 'codependency' },
};

// Numeric IDs from public.addictions — used when mobile_me hasn't been updated
// to JOIN the addictions table yet and still returns the raw integer FK.
const ID_MAP: Record<string, string> = {
  '45': 'Alcohol',
  '46': 'Cannabis/marijuana',
  '47': 'Sex & Porn',
  '48': 'Food & Binge Eating',
  '49': 'Nicotine & Tobacco',
  '50': 'Gambling',
  '51': 'Meth',
  '52': 'Cocaine',
  '53': 'Opiates',
  '54': 'Other addiction-related problems',
};

const FALLBACK = { verb: 'engage in your compulsive behavior', noun: 'compulsive behavior' };

/** Returns the verb/noun pair for the given addiction label (case-insensitive).
 *  Accepts the addictions.title text ("Alcohol") or the raw integer id ("45"). */
export function addictionStruggle(label: string | number | null | undefined): { verb: string; noun: string } {
  if (label == null || label === '') return FALLBACK;
  // Resolve numeric IDs (integer FK from public.users.addiction) to title text.
  const resolved = ID_MAP[String(label)] ?? String(label);
  const key = resolved.toLowerCase().trim();
  if (MAP[key]) return MAP[key];
  for (const [k, v] of Object.entries(MAP)) {
    if (key.includes(k)) return v;
  }
  return FALLBACK;
}
