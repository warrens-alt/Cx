/** Presentation colours depend on category identity, never its current rank or window. */
export const CHART_PALETTE = ['#087f8c', '#345c9c', '#9a6528', '#7560a6', '#547545', '#b7526a'] as const;
const NAMED_COLOURS: Record<string, string> = {
  Green: '#257d57', Blue: '#356db6', Orange: '#d78a28',
  Charcoal: '#485666', Purple: '#8056a6', Red: '#ba4658',
};

export function categoryColour(label: string, identity = label): string {
  if (Object.hasOwn(NAMED_COLOURS, label)) return NAMED_COLOURS[label];
  const stableIdentity = identity.startsWith('string:') ? identity.slice(7) : identity;
  let hash = 2166136261;
  for (const character of stableIdentity) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  return CHART_PALETTE[hash % CHART_PALETTE.length];
}
