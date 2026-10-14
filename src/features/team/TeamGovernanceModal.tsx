import type { UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Modal } from '../../shared/ui';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { TeamMemberList } from './TeamMemberList';

export function TeamGovernanceModal({ teamUsers }: { teamUsers: UserProfile[] }) {
  const isOpen = useUIStore((s) => s.isTeamModalOpen);
  const close = useUIStore((s) => s.closeTeamModal);

  return (
    <Modal
      open={isOpen}
      onClose={close}
      size="xl"
      icon={<ShieldCheck />}
      title="Team & auth settings"
      description="Approve sign-ups, assign roles and reset passwords."
    >
      <a
        href="https://console.firebase.google.com/project/aura-cad-2/authentication/users"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center justify-between gap-3 rounded-md bg-surface-muted border border-line px-3 py-2 text-xs hover:border-line-strong transition-colors"
      >
        <span className="text-muted">
          Sign-in accounts live in Firebase Authentication, project <span className="font-semibold text-ink">aura-cad-2</span>
        </span>
        <span className="flex items-center gap-1 font-semibold text-ink shrink-0">
          Open console <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </a>
      <TeamMemberList members={teamUsers} />
    </Modal>
  );
}
