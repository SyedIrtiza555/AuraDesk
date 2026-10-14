import { useUIStore } from '../../shared/store';
import { auth } from '../../shared/firebase';
import type { ActiveEntity } from '../../shared/types';
import {
  FolderKanban,
  Palette,
  Briefcase,
  Users,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Shield,
} from 'lucide-react';

interface LeftSidebarProps {
  orderCount: number;
  designerCount: number;
  agentCount: number;
  prospectCount: number;
  invoiceCount: number;
  teamCount?: number;
}

interface NavItem {
  id: ActiveEntity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
}

export function LeftSidebar({
  orderCount,
  designerCount,
  agentCount,
  prospectCount,
  invoiceCount,
  teamCount = 0,
}: LeftSidebarProps) {
  const isLeftSidebarOpen = useUIStore((s) => s.isLeftSidebarOpen);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const activeEntity = useUIStore((s) => s.activeEntity);
  const setActiveEntity = useUIStore((s) => s.setActiveEntity);
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const openTeamModal = useUIStore((s) => s.openTeamModal);

  const isDesigner = currentUser?.role === 'designer';
  const isOwner = currentUser?.role === 'owner';
  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const handleSignOut = () => {
    try {
      auth.signOut();
    } catch (e) {
      console.warn(e);
    }
    setCurrentUser(null);
  };

  const navItems: NavItem[] = [
    { id: 'orders', label: 'Orders', icon: FolderKanban, count: orderCount },
    { id: 'designers', label: 'Designers', icon: Palette, count: designerCount },
    { id: 'agents', label: 'Sales Agents', icon: Briefcase, count: agentCount },
    { id: 'prospects', label: 'Prospects', icon: Users, count: prospectCount },
    ...(!isDesigner
      ? [{ id: 'invoices' as ActiveEntity, label: 'Invoices', icon: Receipt, count: invoiceCount }]
      : []),
    ...(isAdminOrOwner
      ? [{ id: 'team' as ActiveEntity, label: 'Team & Roles', icon: Shield, count: teamCount }]
      : []),
  ];

  if (!isLeftSidebarOpen) {
    return (
      <aside className="w-14 bg-white/70 border-r border-slate-200/60 flex flex-col items-center py-4 justify-between shrink-0 select-none backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={toggleLeftSidebar}
            title="Expand Sidebar"
            className="p-2 text-slate-400 hover:text-[#1C1D21] rounded-xl hover:bg-slate-100 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeEntity === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveEntity(item.id);
                    toggleLeftSidebar();
                  }}
                  title={item.label}
                  className={`p-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#1C1D21] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#1C1D21] hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact bottom profile */}
        <div className="flex flex-col items-center gap-2">
          {currentUser && (
            <div
              title={`${currentUser.displayName} (${currentUser.role})`}
              className="w-7 h-7 rounded-full bg-[#1C1D21] text-white flex items-center justify-center text-[10px] font-bold font-mono"
            >
              {currentUser.initials || currentUser.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 bg-white/80 border-r border-slate-200/60 flex flex-col shrink-0 select-none backdrop-blur-xl">
      {/* Brand header */}
      <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#1C1D21] flex items-center justify-center text-white font-mono text-[11px] font-bold">
            AD
          </div>
          <span className="font-semibold text-xs tracking-tight text-[#1C1D21]">
            Aura Desk
          </span>
        </div>
        <button
          onClick={toggleLeftSidebar}
          title="Collapse"
          className="p-1 text-slate-400 hover:text-[#1C1D21] rounded-lg transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Entity Navigation List */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold">
          Entities
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeEntity === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveEntity(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1C1D21] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1C1D21] hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}

        {/* Owner Governance Console button inside sidebar */}
        {isOwner && (
          <div className="pt-2">
            <button
              onClick={openTeamModal}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#6B7280] hover:text-[#1C1D21] hover:bg-slate-100/80 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Team Governance</span>
            </button>
          </div>
        )}
      </div>

      {/* Profile & Logout in the bottom of the left sidebar */}
      <div className="p-3 border-t border-slate-200/60 bg-white/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#1C1D21] text-white flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
              {currentUser?.initials ||
                currentUser?.displayName?.slice(0, 2).toUpperCase() ||
                'AD'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-medium text-[#1C1D21] truncate">
                {currentUser?.displayName}
              </div>
              <div className="text-[10px] font-mono uppercase text-[#6B7280] truncate">
                {currentUser?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
