import { FlaskConical } from 'lucide-react';
import { DEMO_ROLES } from '../../shared/demo';

/** Dev-only pill to preview the app as each role with sample data (see shared/demo.ts). */
export function DemoRoleSwitcher() {
  const current = new URLSearchParams(window.location.search).get('demo') ?? '';

  const switchTo = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', value);
    window.location.assign(url.toString());
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-0.5 rounded-lg bg-surface border border-line shadow-pop p-1">
      <span className="flex items-center gap-1 px-2 text-[11px] font-medium text-accent">
        <FlaskConical className="w-3.5 h-3.5" /> Demo
      </span>
      {DEMO_ROLES.map((r) => (
        <button
          key={r.value}
          onClick={() => switchTo(r.value)}
          className={`h-6 px-2 rounded text-xs transition-colors ${
            current === r.value ? 'bg-accent text-white' : 'text-muted hover:text-ink hover:bg-ink/[0.05]'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
