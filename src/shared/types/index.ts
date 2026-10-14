export type UserRole = 'owner' | 'admin' | 'sales_agent' | 'designer' | 'unassigned';
export type UserStatus = 'pending_approval' | 'active' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  initials?: string;
  photoURL?: string;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
}

export type OrderStatus =
  | 'SUBMITTED_TO_ADMIN'
  | 'RETURNED_TO_AGENT'
  | 'ASSIGNED_TO_DESIGNER'
  | 'IN_PRODUCTION'
  | 'ADMIN_REVIEW'
  | 'IN_REVISION'
  | 'DELIVERED'
  | 'COMPLETED';

export interface StatusHistoryEntry {
  id: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: UserRole;
  timestamp: number;
  note?: string;
}

export interface OrderRevision {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  timestamp: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  title: string;
  client_name: string;
  client_phone?: string; // REDACTED for designer
  agreed_price?: number; // REDACTED for designer
  project_brief: string;
  status: OrderStatus;
  sales_agent_id: string;
  sales_agent_name: string;
  assigned_designer_id?: string;
  assigned_designer_name?: string;
  assigned_designer_initials?: string;
  created_at: number;
  updated_at: number;
  due_date?: number;
  escalation_note?: string;
  admin_feedback?: string;
  revisions?: OrderRevision[];
  status_history?: StatusHistoryEntry[];
  delivery_code?: string;
  delivered_at?: number;
  completed_at?: number;
}

export interface Invoice {
  order_id: string;
  amount: number;
  status: 'unpaid' | 'paid';
  marked_paid_by?: string;
  marked_paid_by_name?: string;
  updated_at: number;
  created_at: number;
}

export interface OrderSnapshot {
  order_id: string;
  date_key: string; // YYYY-MM-DD
  day_number: number;
  timestamp: number;
  snapshot_payload: Partial<Order>;
}

// Multi-View Modes
export type OrderViewMode =
  | 'table'
  | 'kanban_status'
  | 'kanban_resource'
  | 'cards'
  | 'calendar';

// Detail Peek Modes
export type PeekMode = 'side' | 'center' | 'full';

// Active Left Sidebar Entity
export type ActiveEntity =
  | 'orders'
  | 'designers'
  | 'agents'
  | 'prospects'
  | 'invoices'
  | 'team';
