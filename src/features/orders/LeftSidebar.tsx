import type React from 'react';
import { useUIStore } from '../../shared/store';
import { auth } from '../../shared/firebase';
import type { ActiveEntity } from '../../shared/types';
import { Avatar, IconButton, Logo, LogoMark, cn } from '../../shared/ui';
import { useUpdater } from '../layout/UpdateNotifier';
import {
  LayoutDashboard,
  Palette,
  Briefcase,
  Contact,
  Receipt,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  RefreshCw,
} from 'lucide-react';

interface LeftSidebarProps {
  orderCount: number;
  attentionCount: number;
  designerCount: number;
  agentCount: number;
  prospectCount: number;
  invoiceCount: number;
  teamCount: number;
  pendingCount: number;
}

interface NavItem {
  id: ActiveEntity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  highlight?: number;
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_agent: 'Sales agent',
  designer: 'Designer',
  unassigned: 'Pending',
};

export function LeftSidebar(props: LeftSidebarProps) {
  const isOpen = useUIStore((s) => s.isLeftSidebarOpen);
  const toggle = useUIStore((s) => s.toggleLeftSidebar);
  const activeEntity = useUIStore((s) => s.activeEntity);
  const setActiveEntity = useUIStore((s) => s.setActiveEntity);
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const checkForUpdates = useUpdater((s) => s.check);

  const isDesigner = currentUser?.role === 'designer';
  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const handleSignOut = () => {
    auth.signOut().catch((e) => console.warn(e));
    setCurrentUser(null);
  };

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Workspace',
      items: [{ id: 'orders', label: 'Orders', icon: LayoutDashboard, count: props.orderCount, highlight: props.attentionCount }],
    },
    {
      title: 'People',
      items: [
        { id: 'designers', label: 'Designers', icon: Palette, count: props.designerCount },
        { id: 'agents', label: 'Sales agents', icon: Briefcase, count: props.agentCount },
        { id: 'prospects', label: 'Clients', icon: Contact, count: props.prospectCount },
      ],
    },
    ...(!isDesigner
      ? [{ title: 'Finance', items: [{ id: 'invoices' as ActiveEntity, label: 'Invoices', icon: Receipt, count: props.invoiceCount }] }]
      : []),
    ...(isAdminOrOwner
      ? [
          {
            title: 'Admin',
            items: [
              { id: 'team' as ActiveEntity, label: 'Team & roles', icon: ShieldCheck, count: props.teamCount, highlight: props.pendingCount },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        'relative h-full bg-ink text-white flex flex-col shrink-0 transition-[width] duration-200 overflow-hidden',
        isOpen ? 'w-[244px]' : 'w-[68px]'
      )}
    >
      <div className="absolute -top-24 -left-20 w-56 h-56 rounded-full bg-aura/15 blur-3xl pointer-events-none" />

      {/* Brand */}
      <div className={cn('relative flex items-center h-16 shrink-0', isOpen ? 'px-4 justify-between' : 'justify-center')}>
        {isOpen ? <Logo inverse /> : <LogoMark />}
        {isOpen && (
          <IconButton label="Collapse sidebar" tone="inverse" size="sm" onClick={toggle}>
            <PanelLeftClose className="w-4 h-4" />
          </IconButton>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center pb-2">
          <IconButton label="Expand sidebar" tone="inverse" size="sm" onClick={toggle}>
            <PanelLeftOpen className="w-4 h-4" />
          </IconButton>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('relative flex-1 overflow-y-auto scrollbar-thin pb-4', isOpen ? 'px-3' : 'px-2.5')}>
        {sections.map((section) => (
          <div key={section.title} className="mt-4 first:mt-1">
            {isOpen ? (
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {section.title}
              </div>
            ) : (
              <div className="mx-3 mb-2 h-px bg-white/10" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activeEntity === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveEntity(item.id)}
                    title={isOpen ? undefined : item.label}
                    className={cn(
                      'relative w-full flex items-center rounded-xl text-[13.5px] font-medium transition-colors',
                      isOpen ? 'h-10 px-3 gap-3' : 'h-11 justify-center',
                      active ? 'bg-aura text-ink' : 'text-white/65 hover:text-white hover:bg-white/[0.07]'
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {isOpen && <span className="flex-1 text-left truncate">{item.label}</span>}
                    {isOpen && item.highlight ? (
                      <span
                        className={cn(
                          'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center',
                          active ? 'bg-ink text-aura' : 'bg-copper text-white'
                        )}
                        title="Needs attention"
                      >
                        {item.highlight}
                      </span>
                    ) : isOpen ? (
                      <span className={cn('text-xs tabular-nums', active ? 'text-ink/60' : 'text-white/35')}>{item.count}</span>
                    ) : null}
                    {!isOpen && item.highlight ? (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-copper ring-2 ring-ink" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className={cn('relative border-t border-white/10 shrink-0', isOpen ? 'p-3' : 'py-3 flex flex-col items-center gap-1')}>
        {isOpen ? (
          <>
            <div className="flex items-center gap-2.5 px-1.5 py-1">
              <Avatar name={currentUser?.displayName} initials={currentUser?.initials} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{currentUser?.displayName}</div>
                <div className="text-xs text-white/45">{ROLE_LABEL[currentUser?.role ?? 'unassigned']}</div>
              </div>
              <IconButton label="Sign out" tone="inverse" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </IconButton>
            </div>
            <button
              onClick={() => checkForUpdates(true)}
              className="mt-1.5 w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Check for updates</span>
              <span className="tabular-nums">v{__APP_VERSION__}</span>
            </button>
          </>
        ) : (
          <>
            <Avatar name={currentUser?.displayName} initials={currentUser?.initials} size="sm" />
            <IconButton label="Check for updates" tone="inverse" size="sm" onClick={() => checkForUpdates(true)}>
              <RefreshCw className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton label="Sign out" tone="inverse" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </IconButton>
          </>
        )}
      </div>
    </aside>
  );
}
