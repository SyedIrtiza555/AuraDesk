import { describe, it, expect } from 'vitest';
import type { Order, OrderStatus, UserProfile, UserRole } from '../src/shared/types';
import {
  ALL_STATUSES,
  PIPELINE,
  STATUS_META,
  daysSince,
  dueDateOf,
  isAdminRole,
  needsAttentionFrom,
} from '../src/shared/orderStatus';

const DAY = 86400000;

const user = (role: UserRole, uid = `u-${role}`): UserProfile => ({
  uid,
  email: `${role}@studio.test`,
  displayName: role,
  role,
  status: 'active',
  createdAt: 0,
});

const order = (status: OrderStatus, extra: Partial<Order> = {}): Order => ({
  id: 'o1',
  orderNumber: 'AURA-1',
  title: 'Ring',
  client_name: 'Client',
  project_brief: '',
  status,
  sales_agent_id: 'u-agent',
  sales_agent_name: 'Agent',
  assigned_designer_id: 'u-designer',
  assigned_designer_name: 'Designer',
  created_at: 1_000 * DAY,
  updated_at: 1_000 * DAY,
  ...extra,
});

describe('status metadata', () => {
  it('describes every status exactly once', () => {
    expect(new Set(ALL_STATUSES).size).toBe(8);
    for (const s of ALL_STATUSES) expect(STATUS_META[s].label).toBeTruthy();
  });

  it('keeps the returned detour out of the main pipeline', () => {
    expect(PIPELINE).not.toContain('RETURNED_TO_AGENT');
    expect(PIPELINE[0]).toBe('SUBMITTED_TO_ADMIN');
    expect(PIPELINE.at(-1)).toBe('COMPLETED');
  });
});

describe('isAdminRole', () => {
  it('treats owners and admins as admins only', () => {
    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('designer')).toBe(false);
    expect(isAdminRole('sales_agent')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe('needsAttentionFrom', () => {
  const owner = user('owner');
  const admin = user('admin');
  const agent = user('sales_agent', 'u-agent');
  const otherAgent = user('sales_agent', 'u-agent-2');
  const designer = user('designer', 'u-designer');
  const otherDesigner = user('designer', 'u-designer-2');

  it('routes new intakes, reviews and deliveries to admins and owners', () => {
    for (const s of ['SUBMITTED_TO_ADMIN', 'ADMIN_REVIEW', 'DELIVERED'] as OrderStatus[]) {
      expect(needsAttentionFrom(order(s), owner)).toBe(true);
      expect(needsAttentionFrom(order(s), admin)).toBe(true);
      expect(needsAttentionFrom(order(s), designer)).toBe(false);
      expect(needsAttentionFrom(order(s), agent)).toBe(false);
    }
  });

  it('routes returned orders only to the agent who owns them', () => {
    expect(needsAttentionFrom(order('RETURNED_TO_AGENT'), agent)).toBe(true);
    expect(needsAttentionFrom(order('RETURNED_TO_AGENT'), otherAgent)).toBe(false);
    expect(needsAttentionFrom(order('RETURNED_TO_AGENT'), admin)).toBe(false);
  });

  it('routes production work only to the assigned designer', () => {
    for (const s of ['ASSIGNED_TO_DESIGNER', 'IN_PRODUCTION', 'IN_REVISION'] as OrderStatus[]) {
      expect(needsAttentionFrom(order(s), designer)).toBe(true);
      expect(needsAttentionFrom(order(s), otherDesigner)).toBe(false);
      expect(needsAttentionFrom(order(s), owner)).toBe(false);
    }
  });

  it('never flags completed orders or a signed-out user', () => {
    for (const u of [owner, admin, agent, designer]) {
      expect(needsAttentionFrom(order('COMPLETED'), u)).toBe(false);
    }
    expect(needsAttentionFrom(order('SUBMITTED_TO_ADMIN'), null)).toBe(false);
  });
});

describe('dates', () => {
  it('defaults the due date to five days after creation', () => {
    expect(dueDateOf(order('IN_PRODUCTION'))).toBe(1_005 * DAY);
    expect(dueDateOf(order('IN_PRODUCTION', { due_date: 1_002 * DAY }))).toBe(1_002 * DAY);
  });

  it('counts whole days and never goes negative', () => {
    expect(daysSince(1_000 * DAY, 1_003 * DAY + 5)).toBe(3);
    expect(daysSince(1_000 * DAY, 999 * DAY)).toBe(0);
  });
});

describe('order numbers', () => {
  it('formats with year and a padded sequence', async () => {
    const { formatOrderNumber } = await import('../src/shared/orderNumbers');
    expect(formatOrderNumber(7, 2026)).toBe('AURA-2026-007');
    expect(formatOrderNumber(1234, 2026)).toBe('AURA-2026-1234');
  });

  it('continues after the highest existing number, not the count', async () => {
    const { nextSequenceFrom } = await import('../src/shared/orderNumbers');
    expect(nextSequenceFrom([])).toBe(1);
    expect(nextSequenceFrom(['AURA-2026-003', 'AURA-2026-010', 'AURA-2025-002'])).toBe(11);
    expect(nextSequenceFrom(['custom', 'AURA-2026-004'])).toBe(5);
  });
});
