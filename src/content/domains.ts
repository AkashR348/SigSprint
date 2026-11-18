// PTCE content outline effective 2026-01-06. Weights are percent of scored items.
export type DomainId = 'medications' | 'federal' | 'safety' | 'orderEntry';

export type Domain = { id: DomainId; name: string; weight: number };

export const domains: readonly Domain[] = [
  { id: 'medications', name: 'Medications', weight: 35 },
  { id: 'federal', name: 'Federal Requirements', weight: 18.75 },
  { id: 'safety', name: 'Patient Safety and Quality Assurance', weight: 23.75 },
  { id: 'orderEntry', name: 'Order Entry and Processing', weight: 22.5 },
];

/** A domain's name for the screen. */
export function domainName(id: DomainId): string {
  return domains.find((d) => d.id === id)?.name ?? id;
}

export const mockExam = { questions: 90, scored: 80, minutes: 110 } as const;

/** Splits `total` questions across the chosen domains by exam weight; the counts sum to `total`. */
export function allocateQuestions(total: number, ids: readonly DomainId[]): Record<DomainId, number> {
  const out: Record<DomainId, number> = { medications: 0, federal: 0, safety: 0, orderEntry: 0 };
  const chosen = domains.filter((d) => ids.includes(d.id));
  // NaN, Infinity and totals past exact integers have no split.
  if (!Number.isSafeInteger(Math.floor(total))) return out;
  const count = Math.max(0, Math.floor(total));
  if (chosen.length === 0 || count === 0) return out;
  const weightSum = chosen.reduce((sum, d) => sum + d.weight, 0);
  const shares = chosen.map((d) => ({ id: d.id, exact: (count * d.weight) / weightSum }));
  let left = count;
  for (const s of shares) {
    out[s.id] = Math.floor(s.exact);
    left -= out[s.id];
  }
  // Largest remainders take the questions flooring left over.
  const byRemainder = [...shares].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; i < left; i++) out[byRemainder[i % byRemainder.length].id] += 1;
  return out;
}
