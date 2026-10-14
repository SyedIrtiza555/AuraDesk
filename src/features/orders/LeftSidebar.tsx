import type React from 'react';
import { useUIStore } from '../../shared/store';
import { auth } from '../../shared/firebase';
import type { ActiveEntity } from '../../shared/types';
import { Avatar, IconButton, Logo, LogoMark, cn } from '../../shared/ui';
import { useTheme, type ThemePreference } from '../../shared/theme';
import { useUpdater } from '../layout/UpdateNotifier';
import {
  LayoutList,
  Palette,
  Briefcase,
  Contact,
  Receipt,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  RefreshCw,
  Monitor,
  Sun,
  Moon,
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

// The theme button cycles Light -> Dark -> Match system
const THEME_OPTIONS: { value: ThemePreference; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', title: 'Light', icon: Sun },
  { value: 'dark', title: 'Dark', icon: Moon },
  { value: 'system', title: 'Match system', icon: Monitor },
];

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

  const sections: { title?: string; items: NavItem[] }[] = [
    { items: [{ id: 'orders', label: 'Orders', icon: LayoutList, count: props.orderCount, highlight: props.attentionCount }] },
    {
      title: 'People',
      items: [
        { id: 'designers', label: 'Designers', icon: Palette, count: props.designerCount },
        { id: 'agents', label: 'Sales agents', icon: Briefcase, count: props.agentCount },
        { id: 'prospects', label: 'Clients', icon: Contact, count: props.prospectCount },
      ],
    },
    ...(!isDesigner || isAdminOrOwner
      ? [
          {
            title: 'Workspace',
            items: [
              ...(!isDesigner ? [{ id: 'invoices' as ActiveEntity, label: 'Invoices', icon: Receipt, count: props.invoiceCount }] : []),
              ...(isAdminOrOwner
                ? [{ id: 'team' as ActiveEntity, label: 'Team & roles', icon: ShieldCheck, count: props.teamCount, highlight: props.pendingCount }]
                : []),
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-line flex flex-col shrink-0 transition-[width] duration-150 overflow-hidden',
        isOpen ? 'w-[220px]' : 'w-[52px]'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-12 shrink-0', isOpen ? 'pl-4 pr-2 justify-between' : 'justify-center')}>
        {isOpen ? <Logo /> : <LogoMark />}
        {isOpen && (
          <IconButton label="Collapse sidebar" size="sm" onClick={toggle}>
            <PanelLeftClose className="w-3.5 h-3.5" />
          </IconButton>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center pb-1">
          <IconButton label="Expand sidebar" size="sm" onClick={toggle}>
            <PanelLeftOpen className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={i > 0 ? 'mt-4' : 'mt-1'}>
            {section.title &&
              (isOpen ? (
                <div className="px-2 mb-1 text-[11px] font-medium text-faint">{section.title}</div>
              ) : (
                <div className="mx-2 mb-2 h-px bg-line" />
              ))}
            <div className="space-y-px">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activeEntity === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveEntity(item.id)}
                    title={isOpen ? undefined : item.label}
                    className={cn(
                      'relative w-full flex items-center rounded-md text-[13px] transition-colors',
                      isOpen ? 'h-7 px-2 gap-2' : 'h-8 justify-center',
                      active
                        ? 'bg-ink/[0.06] text-ink font-medium'
                        : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-accent' : 'text-muted')} />
                    {isOpen && <span className="flex-1 text-left truncate">{item.label}</span>}
                    {isOpen && item.highlight ? (
                      <span
                        className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-accent text-white"
                        title="Needs attention"
                      >
                        {item.highlight}
                      </span>
                    ) : isOpen ? (
                      <span className="text-xs text-faint tabular-nums">{item.count}</span>
                    ) : null}
                    {!isOpen && item.highlight ? (
                      <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className={cn('border-t border-line shrink-0', isOpen ? 'p-2' : 'py-2 flex flex-col items-center gap-1')}>
        {isOpen ? (
          <>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <Avatar name={currentUser?.displayName} initials={currentUser?.initials} size="sm" />
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-[13px] font-medium text-ink truncate">{currentUser?.displayName}</div>
                <div className="text-[11px] text-muted">{ROLE_LABEL[currentUser?.role ?? 'unassigned']}</div>
              </div>
              <ThemeButton />
              <IconButton label="Sign out" size="sm" onClick={handleSignOut}>
                <LogOut className="w-3.5 h-3.5" />
              </IconButton>
            </div>
            <button
              onClick={() => checkForUpdates(true)}
              className="mt-0.5 w-full flex items-center gap-2 h-7 px-2 rounded-md text-xs text-muted hover:text-ink hover:bg-ink/[0.04] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Check for updates</span>
              <span className="tabular-nums text-faint">v{__APP_VERSION__}</span>
            </button>
          </>
        ) : (
          <>
            <Avatar name={currentUser?.displayName} initials={currentUser?.initials} size="sm" />
            <ThemeButton />
            <IconButton label="Check for updates" size="sm" onClick={() => checkForUpdates(true)}>
              <RefreshCw className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton label="Sign out" size="sm" onClick={handleSignOut}>
              <LogOut className="w-3.5 h-3.5" />
            </IconButton>
          </>
        )}
      </div>
    </aside>
  );
}

function ThemeButton() {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);
  const index = Math.max(0, THEME_OPTIONS.findIndex((o) => o.value === preference));
  const current = THEME_OPTIONS[index];
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
  const Icon = current.icon;
  return (
    <IconButton
      label={`Theme: ${current.title}. Click for ${next.title.toLowerCase()}`}
      size="sm"
      onClick={() => setPreference(next.value)}
    >
      <Icon className="w-3.5 h-3.5" />
    </IconButton>
  );
}
