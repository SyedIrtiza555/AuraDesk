import { useState } from 'react';
import type React from 'react';
import type { Order, UserProfile } from '../../../shared/types';
import { Avatar, EmptyState, SegmentedControl, cn } from '../../../shared/ui';
import { useNow } from '../../../shared/hooks';
import { OrderCard } from './OrderCard';
import { Palette, Briefcase, UserX } from 'lucide-react';

const CAPACITY = 5; // active orders that count as a full bench

export function KanbanResourceView({ orders, teamUsers }: { orders: Order[]; teamUsers: UserProfile[] }) {
  const now = useNow();
  const [tab, setTab] = useState<'designers' | 'agents'>('designers');

  const people = teamUsers.filter((u) => u.role === (tab === 'designers' ? 'designer' : 'sales_agent') && u.status === 'active');
  const unassigned = orders.filter((o) => !o.assigned_designer_id && o.status !== 'COMPLETED');

  return (
    <div className="h-full flex flex-col gap-2.5">
      <SegmentedControl
        size="sm"
        className="self-start"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'designers', label: 'Designers', icon: Palette },
          { value: 'agents', label: 'Sales agents', icon: Briefcase },
        ]}
      />

      <div className="flex-1 min-h-0 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {people.length === 0 && (
          <div className="flex-1 border border-line rounded-lg">
            <EmptyState
              icon={<UserX />}
              title={`No active ${tab === 'designers' ? 'designers' : 'sales agents'}`}
              description="Assign roles in Team & roles to see their workload here."
            />
          </div>
        )}

        {tab === 'designers' && people.length > 0 && unassigned.length > 0 && (
          <Lane title="Waiting for a designer" subtitle={`${unassigned.length} order${unassigned.length === 1 ? '' : 's'}`} muted>
            {unassigned.map((o) => (
              <OrderCard key={o.id} order={o} now={now} showStatus />
            ))}
          </Lane>
        )}

        {people.map((member) => {
          const memberOrders = orders.filter((o) =>
            tab === 'designers' ? o.assigned_designer_id === member.uid : o.sales_agent_id === member.uid
          );
          const activeCount = memberOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERED').length;
          const load = Math.min(1, activeCount / CAPACITY);

          return (
            <Lane
              key={member.uid}
              avatar={<Avatar name={member.displayName} initials={member.initials} size="sm" />}
              title={member.displayName}
              subtitle={`${activeCount} active · ${memberOrders.length} total`}
              load={tab === 'designers' ? load : undefined}
            >
              {memberOrders.length === 0 ? (
                <div className="h-14 rounded-md border border-dashed border-line flex items-center justify-center text-xs text-faint">
                  Free to take work
                </div>
              ) : (
                memberOrders.map((o) => <OrderCard key={o.id} order={o} now={now} showStatus />)
              )}
            </Lane>
          );
        })}
      </div>
    </div>
  );
}

function Lane({
  avatar,
  title,
  subtitle,
  load,
  muted,
  children,
}: {
  avatar?: React.ReactNode;
  title: string;
  subtitle: string;
  load?: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'w-[260px] shrink-0 flex flex-col rounded-lg border',
        muted ? 'bg-amber-50/50 border-amber-200/70' : 'bg-surface-muted border-line'
      )}
    >
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5">
          {avatar}
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink truncate">{title}</div>
            <div className="text-xs text-muted">{subtitle}</div>
          </div>
        </div>
        {load !== undefined && (
          <div className="mt-2 h-1 rounded-full bg-line overflow-hidden" title={`${Math.round(load * 100)}% of a full bench`}>
            <div
              className={cn('h-full rounded-full', load >= 1 ? 'bg-rose-400' : load >= 0.6 ? 'bg-amber-500' : 'bg-accent')}
              style={{ width: `${Math.max(load * 100, 4)}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 scrollbar-thin">{children}</div>
    </div>
  );
}
