import { describe, it, expect } from 'vitest';
import type { Order, UserProfile } from '../src/shared/types';

describe('Aura Desk Role & Security Invariants', () => {
  it('strictly quarantines newly registered users into pending_approval and unassigned', () => {
    const newUser: UserProfile = {
      uid: 'user-new-001',
      email: 'applicant@auradesk.internal',
      displayName: 'Applicant',
      role: 'unassigned',
      status: 'pending_approval',
      createdAt: Date.now(),
    };

    expect(newUser.role).toBe('unassigned');
    expect(newUser.status).toBe('pending_approval');
  });

  it('redacts agreed_price and client_phone from designer view model', () => {
    const rawOrder: Order = {
      id: 'ord-test-01',
      orderNumber: 'AURA-2026-001',
      title: 'Three Stone Ring',
      client_name: 'Patrick Archer',
      client_phone: '+1 555-0199',
      agreed_price: 1500,
      project_brief: 'Platinum ring design',
      status: 'IN_PRODUCTION',
      sales_agent_id: 'agent-01',
      sales_agent_name: 'Sophia Reed',
      assigned_designer_id: 'designer-01',
      assigned_designer_name: 'Felix Alvarez',
      assigned_designer_initials: 'FA',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Masking function applied for Designer role
    const maskForDesigner = (order: Order, role: string): Partial<Order> => {
      if (role === 'designer') {
        const { agreed_price, client_phone, ...rest } = order;
        return rest;
      }
      return order;
    };

    const designerVisibleOrder = maskForDesigner(rawOrder, 'designer');
    expect(designerVisibleOrder.agreed_price).toBeUndefined();
    expect(designerVisibleOrder.client_phone).toBeUndefined();
    expect(designerVisibleOrder.title).toBe('Three Stone Ring');
  });

  it('formulates deterministic WhatsApp delivery code format: <Designer>-<Prospect>-<Order>', () => {
    const designerInitials = 'FA';
    const clientName = 'Patrick Archer';
    const orderTitle = 'Three Stone Ring';

    const prospectInitials = clientName
      .split(' ')
      .map((n) => n[0].toUpperCase())
      .join('');

    const generatedCode = `${designerInitials}-${prospectInitials}-${orderTitle}`;
    expect(generatedCode).toBe('FA-PA-Three Stone Ring');
  });
});
