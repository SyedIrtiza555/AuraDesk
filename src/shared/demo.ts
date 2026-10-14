import type { Order, OrderStatus, UserProfile, UserRole } from './types';

/**
 * Dev-only design preview. Open the dev server with `?demo` (owner) or
 * `?demo=admin|sales_agent|designer|pending` to see the app with sample data,
 * without signing in or touching Firestore. Stripped from production builds.
 */
const demoParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('demo') : null;

export const isDemo = import.meta.env.DEV && demoParam !== null;

const DAY = 86400000;
const now = Date.now();

// Sample data only exists in dev builds (the ternary is compiled away in production)
export const DEMO_TEAM: UserProfile[] = !import.meta.env.DEV ? [] : [
  { uid: 'u-owner', email: 'owner@auradesk.studio', displayName: 'Syed Irtiza', role: 'owner', status: 'active', initials: 'SI', createdAt: now - 90 * DAY },
  { uid: 'u-admin', email: 'maya@auradesk.studio', displayName: 'Maya Chen', role: 'admin', status: 'active', initials: 'MC', createdAt: now - 60 * DAY },
  { uid: 'u-agent1', email: 'leo@auradesk.studio', displayName: 'Leo Marsh', role: 'sales_agent', status: 'active', initials: 'LM', createdAt: now - 50 * DAY },
  { uid: 'u-agent2', email: 'nadia@auradesk.studio', displayName: 'Nadia Karim', role: 'sales_agent', status: 'active', initials: 'NK', createdAt: now - 40 * DAY },
  { uid: 'u-des1', email: 'felix@auradesk.studio', displayName: 'Felix Alvarez', role: 'designer', status: 'active', initials: 'FA', createdAt: now - 45 * DAY },
  { uid: 'u-des2', email: 'ines@auradesk.studio', displayName: 'Inès Moreau', role: 'designer', status: 'active', initials: 'IM', createdAt: now - 30 * DAY },
  { uid: 'u-des3', email: 'omar@auradesk.studio', displayName: 'Omar Haddad', role: 'designer', status: 'suspended', initials: 'OH', createdAt: now - 20 * DAY },
  { uid: 'u-new', email: 'priya@gmail.com', displayName: 'Priya Nair', role: 'unassigned', status: 'pending_approval', initials: 'PN', createdAt: now - 1 * DAY },
];

const ROLE_TO_UID: Record<string, string> = {
  '': 'u-owner',
  owner: 'u-owner',
  admin: 'u-admin',
  sales_agent: 'u-agent1',
  designer: 'u-des1',
  pending: 'u-new',
};

export const demoUser = (): UserProfile =>
  DEMO_TEAM.find((u) => u.uid === (ROLE_TO_UID[demoParam ?? ''] ?? 'u-owner')) ?? DEMO_TEAM[0];

const person = (uid: string) => DEMO_TEAM.find((u) => u.uid === uid)!;

function order(
  n: number,
  title: string,
  client: string,
  status: OrderStatus,
  ageDays: number,
  price: number,
  agentUid: string,
  designerUid: string | null,
  brief: string,
  extra: Partial<Order> = {}
): Order {
  const agent = person(agentUid);
  const designer = designerUid ? person(designerUid) : null;
  return {
    id: `demo-${n}`,
    orderNumber: `AURA-2026-${String(n).padStart(3, '0')}`,
    title,
    client_name: client,
    client_phone: '+1 555 01' + String(n).padStart(2, '0'),
    agreed_price: price,
    project_brief: brief,
    status,
    sales_agent_id: agent.uid,
    sales_agent_name: agent.displayName,
    ...(designer
      ? {
          assigned_designer_id: designer.uid,
          assigned_designer_name: designer.displayName,
          assigned_designer_initials: designer.initials,
        }
      : {}),
    created_at: now - ageDays * DAY,
    updated_at: now - Math.max(0, ageDays - 1) * DAY,
    due_date: now + (6 - ageDays) * DAY,
    ...extra,
  };
}

export const DEMO_ORDERS: Order[] = !import.meta.env.DEV ? [] : [
  order(1, 'Three-stone platinum halo ring', 'Patrick Archer', 'SUBMITTED_TO_ADMIN', 0, 1450, 'u-agent1', null,
    'Platinum 950, 1.2ct oval centre with two 0.3ct pear sides. Size 6.5, low cathedral setting.'),
  order(2, 'Vintage milgrain wedding band', 'Hannah Okafor', 'SUBMITTED_TO_ADMIN', 1, 680, 'u-agent2', null,
    '18k yellow gold, 3mm band, milgrain edges, hand-engraved vine pattern inside.'),
  order(3, 'Emerald cut solitaire pendant', 'Diego Ramírez', 'RETURNED_TO_AGENT', 2, 920, 'u-agent1', null,
    'White gold bezel pendant for 2ct emerald cut. Chain length unclear.',
    { escalation_note: 'Client must confirm chain length (16" or 18") and bail style before we start.' }),
  order(4, 'Signet ring with family crest', 'Charlotte Wells', 'ASSIGNED_TO_DESIGNER', 2, 1180, 'u-agent2', 'u-des1',
    'Oval signet, 14k rose gold, deep-engraved crest from supplied artwork. Size 9.'),
  order(5, 'Art-deco sapphire earrings', 'Amara Singh', 'IN_PRODUCTION', 4, 2100, 'u-agent1', 'u-des1',
    'Pair of drop earrings, calibré sapphires with diamond accents, platinum.'),
  order(6, 'Toi et moi engagement ring', 'Lucas Becker', 'IN_PRODUCTION', 3, 3200, 'u-agent2', 'u-des2',
    'Pear + round diamond, open shank, 18k yellow gold claws.'),
  order(7, 'Men\'s brushed titanium band', 'Ethan Brooks', 'ADMIN_REVIEW', 5, 540, 'u-agent1', 'u-des2',
    '8mm comfort-fit, brushed finish with polished bevels, black zirconium inlay.'),
  order(8, 'Pavé eternity band', 'Sofia Rossi', 'IN_REVISION', 6, 1650, 'u-agent2', 'u-des1',
    'Full eternity, 2mm micro-pavé, size 5.75.',
    {
      admin_feedback: 'Stone spacing too tight on the underside; open it up by 0.1mm.',
      revisions: [
        { id: 'r1', authorId: 'u-admin', authorName: 'Maya Chen', authorRole: 'admin', message: 'Stone spacing too tight on the underside; open it up by 0.1mm.', timestamp: now - 1 * DAY },
      ],
    }),
  order(9, 'Rose-gold cuff bracelet', 'Grace Liu', 'DELIVERED', 8, 1890, 'u-agent1', 'u-des2',
    'Open cuff, hammered texture, 14k rose gold.',
    { delivery_code: 'IM-GL-Rose-gold cuff bracelet', delivered_at: now - 1 * DAY }),
  order(10, 'Diamond tennis necklace', 'Oliver Grant', 'COMPLETED', 14, 4800, 'u-agent2', 'u-des1',
    '4-prong tennis necklace, 16", lab diamonds 0.1ct each.',
    { completed_at: now - 3 * DAY, delivered_at: now - 4 * DAY }),
];

export const DEMO_ROLES: { value: string; label: string; role: UserRole | 'pending' }[] = [
  { value: '', label: 'Owner', role: 'owner' },
  { value: 'admin', label: 'Admin', role: 'admin' },
  { value: 'sales_agent', label: 'Sales agent', role: 'sales_agent' },
  { value: 'designer', label: 'Designer', role: 'designer' },
  { value: 'pending', label: 'Pending', role: 'pending' },
];
