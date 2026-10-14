import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { Order, OrderSnapshot } from '../../shared/types';
import { History, Calendar, Clock } from 'lucide-react';
import { Badge } from '../../shared/ui';

interface TimeMachineSliderProps {
  order: Order;
  onSnapshotSelect?: (snapshotData: Partial<Order> | null) => void;
}

export function TimeMachineSlider({ order, onSnapshotSelect }: TimeMachineSliderProps) {
  const [snapshots, setSnapshots] = useState<OrderSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Calculate days elapsed from order creation to today
  const orderCreatedAt = order.created_at || Date.now();
  const daysTotal = Math.max(
    1,
    Math.ceil((Date.now() - orderCreatedAt) / (1000 * 60 * 60 * 24))
  );

  // Lazy Querying: Snapshots are fetched ONLY when the Time Machine component mounts
  useEffect(() => {
    let isCancelled = false;

    async function loadSnapshots() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'order_snapshots'),
          where('order_id', '==', order.id)
        );
        const querySnap = await getDocs(q);

        if (!querySnap.empty && !isCancelled) {
          const list: OrderSnapshot[] = [];
          querySnap.forEach((doc) => {
            list.push(doc.data() as OrderSnapshot);
          });
          list.sort((a, b) => a.day_number - b.day_number);
          setSnapshots(list);
          setSelectedIndex(list.length - 1);
        } else if (!isCancelled) {
          // Generate synthetic timeline checkpoints if fresh order without stored historical records
          const mockSnapshots: OrderSnapshot[] = Array.from({ length: daysTotal }, (_, idx) => {
            const dayNum = idx + 1;
            const dayDate = new Date(orderCreatedAt + idx * 86400000);
            return {
              order_id: order.id,
              date_key: dayDate.toISOString().split('T')[0],
              day_number: dayNum,
              timestamp: dayDate.getTime(),
              snapshot_payload: {
                status:
                  dayNum === 1
                    ? 'SUBMITTED_TO_ADMIN'
                    : dayNum === daysTotal
                    ? order.status
                    : 'IN_PRODUCTION',
                project_brief: order.project_brief,
                admin_feedback: dayNum > 1 ? order.admin_feedback : undefined,
              },
            };
          });
          setSnapshots(mockSnapshots);
          setSelectedIndex(mockSnapshots.length - 1);
        }
      } catch (err) {
        console.warn('[TimeMachine] Failed to query snapshots:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadSnapshots();
    return () => {
      isCancelled = true;
    };
  }, [order.id, order.created_at, daysTotal]);

  const activeSnapshot = snapshots[selectedIndex];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSelectedIndex(val);
    if (onSnapshotSelect && snapshots[val]) {
      onSnapshotSelect(snapshots[val].snapshot_payload);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">
            Order Time Machine (Day-Wise Scrubber)
          </span>
        </div>
        {activeSnapshot && (
          <Badge variant="purple" className="text-[10px] font-mono">
            Day {activeSnapshot.day_number} / {snapshots.length}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="py-3 text-center text-xs text-slate-500 animate-pulse flex items-center justify-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Loading lazy historical snapshots...
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, snapshots.length - 1)}
              value={selectedIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Day 1 (Intake)</span>
              <span>Day {snapshots.length} (Current)</span>
            </div>
          </div>

          {activeSnapshot && (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  {activeSnapshot.date_key}
                </span>
                <span className="font-mono text-indigo-300 font-medium">
                  Status: {activeSnapshot.snapshot_payload.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-2">
                <span className="text-slate-500">Brief state: </span>
                {activeSnapshot.snapshot_payload.project_brief}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
