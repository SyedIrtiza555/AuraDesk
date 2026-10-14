import { FlaskConical } from 'lucide-react';
import { DEMO_ROLES } from '../../shared/demo';

/** Dev-only pill to preview the app as each role with sample data (see shared/demo.ts). */
export function DemoRoleSwitcher() {
  const current = new URLSearchParams(window.location.search).get('demo') ?? '';

  const switchTo = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', value);
    window.location.href = url.toString();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1 rounded-full bg-ink/90 backdrop-blur px-1.5 py-1.5 shadow-pop">
      <span className="flex items-center gap-1.5 pl-2 pr-1 text-[11px] font-semibold text-aura">
        <FlaskConical className="w-3.5 h-3.5" /> Demo
      </span>
      {DEMO_ROLES.map((r) => (
        <button
          key={r.value}
          onClick={() => switchTo(r.value)}
          className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
            current === r.value ? 'bg-aura text-ink' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
