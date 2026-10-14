import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/** AURA-<year>-<sequence>, padded to at least three digits. */
export const formatOrderNumber = (seq: number, year = new Date().getFullYear()) =>
  `AURA-${year}-${String(seq).padStart(3, '0')}`;

/** Next sequence after the highest one already used (ignores malformed numbers). */
export function nextSequenceFrom(orderNumbers: string[]): number {
  let max = 0;
  for (const n of orderNumbers) {
    const match = /-(\d+)$/.exec(n ?? '');
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

/**
 * Reserves the next order number with a transaction on counters/orders, so two people creating
 * orders at the same time never get the same number. Falls back to "highest known + 1" when the
 * counter can't be used (offline, or firestore.rules not deployed yet).
 */
export async function reserveOrderNumber(knownOrderNumbers: string[]): Promise<string> {
  const fallback = nextSequenceFrom(knownOrderNumbers);
  try {
    const seq = await runTransaction(db, async (tx) => {
      const ref = doc(db, 'counters', 'orders');
      const snap = await tx.get(ref);
      const stored = snap.exists() ? Number(snap.data().next) : NaN;
      // Never hand out a number below one we can already see
      const next = Number.isFinite(stored) ? Math.max(stored, fallback) : fallback;
      tx.set(ref, { next: next + 1 });
      return next;
    });
    return formatOrderNumber(seq);
  } catch (err) {
    console.warn('[Aura Desk] Order counter unavailable, using local numbering:', err);
    return formatOrderNumber(fallback);
  }
}
