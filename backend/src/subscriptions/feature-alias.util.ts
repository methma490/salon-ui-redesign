/**
 * Backward-compatible aliases between legacy and canonical feature codes.
 * Plan access is never hardcoded here — only code equivalence for runtime checks.
 */
const FEATURE_ALIASES: Record<string, readonly string[]> = {
  MULTI_BRANCH: ['BRANCH_MANAGEMENT'],
  BRANCH_MANAGEMENT: ['MULTI_BRANCH'],
  STAFF_MANAGEMENT: ['ROLE_MANAGEMENT'],
  ROLE_MANAGEMENT: ['STAFF_MANAGEMENT'],
};

export function featureCodesEquivalent(required: string, granted: string): boolean {
  if (required === granted) {
    return true;
  }

  const aliases = FEATURE_ALIASES[required] ?? [];
  return aliases.includes(granted);
}

export function expandFeatureCodes(codes: string[]): string[] {
  const expanded = new Set<string>();

  for (const code of codes) {
    expanded.add(code);
    for (const alias of FEATURE_ALIASES[code] ?? []) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}
