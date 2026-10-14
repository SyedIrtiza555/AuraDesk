import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { Order, OrderSnapshot } from '../../shared/types';
import { SectionLabel, Spinner, cn } from '../../shared/ui';
import { STATUS_META, StatusPill } from '../../shared/orderStatus';
import { isDemo } from '../../shared/demo';
import { History } from 'lucide-react';

/**
 * Day-by-day history of an order, read lazily from order_snapshots (one per day it changed).
 * Shows only real recorded snapshots; nothing is invented for days without one.
 */
export function TimeMachineSlider({ order }: { order: Order }) {
  const [snapshots, setSnapshots] = useState<OrderSnapshot[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(isDemo ? order.id : null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    getDocs(query(collection(db, 'order_snapshots'), where('order_id', '==', order.id)))
      .then((snap) => {
        if (cancelled) return;
        const list: OrderSnapshot[] = [];
        snap.forEach((d) => list.push(d.data() as OrderSnapshot));
        list.sort((a, b) => a.timestamp - b.timestamp);
        setSnapshots(list);
        setSelected(null);
      })
      .catch((err) => console.warn('[TimeMachine] Failed to query snapshots:', err))
      .finally(() => !cancelled && setLoadedFor(order.id));
    return () => {
      cancelled = true;
    };
  }, [order.id, order.updated_at]);

  const loading = loadedFor !== order.id;
  const index = selected ?? snapshots.length - 1;
  const active = snapshots[index];

  return (
    <section className="bg-surface border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <SectionLabel icon={<History />}>History</SectionLabel>
        {snapshots.length > 0 && (
          <span className="text-xs text-faint">
            {index + 1} of {snapshots.length} days
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <Spinner className="w-3.5 h-3.5" /> Loading history…
        </div>
      ) : snapshots.length === 0 ? (
        <p className="mt-3 text-[13px] text-faint">
          Created {new Date(order.created_at).toLocaleDateString()}. Daily snapshots are recorded from the next change on.
        </p>
      ) : (
        <>
          {/* Timeline of recorded days */}
          <div className="mt-4 flex items-center gap-1">
            {snapshots.map((s, i) => (
              <button
                key={s.date_key}
                onClick={() => setSelected(i)}
                title={`${s.date_key} · ${s.snapshot_payload.status ? STATUS_META[s.snapshot_payload.status].label : ''}`}
                className={cn(
                  'flex-1 h-2 rounded-full transition-all',
                  s.snapshot_payload.status ? STATUS_META[s.snapshot_payload.status].bar : 'bg-line',
                  i === index ? 'ring-2 ring-offset-2 ring-ink' : 'opacity-60 hover:opacity-100'
                )}
              />
            ))}
          </div>

          {active && (
            <div className="mt-4 rounded-xl bg-surface-muted p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {new Date(active.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  <span className="text-muted font-normal"> · day {active.day_number}</span>
                </span>
                {active.snapshot_payload.status && <StatusPill status={active.snapshot_payload.status} size="sm" />}
              </div>
              {active.snapshot_payload.project_brief && (
                <p className="mt-2 text-[13px] text-muted line-clamp-3">{active.snapshot_payload.project_brief}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
