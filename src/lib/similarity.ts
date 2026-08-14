// Fuzzy match for catching near-duplicate lead names — typos and
// spacing/punctuation variants like "FitZone Gym" vs "Fit Zone Gym"
// (which normalize to the same string) or "Costal" vs "Coastal" (one
// character apart). Deliberately simple: no external dependency, no
// database extension, just a normalize + edit-distance check that's fine
// at the scale (dozens to low thousands of leads) this app runs at.

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function isSimilarName(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length < 3 || nb.length < 3) return false;
  if (na === nb) return true;

  const distance = levenshtein(na, nb);
  const threshold = Math.max(1, Math.floor(Math.min(na.length, nb.length) * 0.2));
  return distance <= threshold;
}

export function findSimilarNames<T extends { organizationName: string }>(
  name: string,
  candidates: T[]
): T[] {
  return candidates.filter((c) => isSimilarName(name, c.organizationName));
}
