import { create } from 'zustand';
import type {
  Order,
  UserProfile,
  OrderStatus,
  OrderViewMode,
  PeekMode,
  ActiveEntity,
} from './types';

interface UIState {
  // Authentication & current user
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;

  // Multi-View Navigation
  activeViewMode: OrderViewMode;
  setActiveViewMode: (mode: OrderViewMode) => void;

  // Collapsible Sidebars
  isLeftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;

  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;

  // Active Entity Selection (Left Sidebar)
  activeEntity: ActiveEntity;
  setActiveEntity: (entity: ActiveEntity) => void;

  // Selected Order & Peek Presentation Mode
  selectedOrderId: string | null;
  selectedOrder: Order | null;
  peekMode: PeekMode;
  setSelectedOrder: (order: Order | null, peek?: PeekMode) => void;
  setPeekMode: (peek: PeekMode) => void;

  // Safety Delivery Modal
  isDeliveryModalOpen: boolean;
  deliveryModalOrder: Order | null;
  openDeliveryModal: (order: Order) => void;
  closeDeliveryModal: () => void;

  // New Order Modal (Sales Agent)
  isNewOrderModalOpen: boolean;
  openNewOrderModal: () => void;
  closeNewOrderModal: () => void;

  // Team Governance Modal (Owner)
  isTeamModalOpen: boolean;
  openTeamModal: () => void;
  closeTeamModal: () => void;

  // Escalation Modal (Admin)
  isEscalateModalOpen: boolean;
  escalatingOrder: Order | null;
  openEscalateModal: (order: Order) => void;
  closeEscalateModal: () => void;

  // Filter & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: OrderStatus | 'ALL';
  setStatusFilter: (filter: OrderStatus | 'ALL') => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Multi-View Mode (Default: Table view)
  activeViewMode: 'table',
  setActiveViewMode: (mode) => set({ activeViewMode: mode }),

  // Dual Collapsible Sidebars
  isLeftSidebarOpen: true,
  toggleLeftSidebar: () => set((s) => ({ isLeftSidebarOpen: !s.isLeftSidebarOpen })),
  setLeftSidebarOpen: (open) => set({ isLeftSidebarOpen: open }),

  isRightSidebarOpen: true,
  toggleRightSidebar: () => set((s) => ({ isRightSidebarOpen: !s.isRightSidebarOpen })),
  setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),

  // Left Sidebar Entity
  activeEntity: 'orders',
  setActiveEntity: (entity) => set({ activeEntity: entity }),

  // Selected Order & Peek Presentation
  selectedOrderId: null,
  selectedOrder: null,
  peekMode: 'side',
  setSelectedOrder: (order, peek = 'side') =>
    set({
      selectedOrder: order,
      selectedOrderId: order ? order.id : null,
      peekMode: peek,
    }),
  setPeekMode: (peek) => set({ peekMode: peek }),

  isDeliveryModalOpen: false,
  deliveryModalOrder: null,
  openDeliveryModal: (order) =>
    set({ isDeliveryModalOpen: true, deliveryModalOrder: order }),
  closeDeliveryModal: () =>
    set({ isDeliveryModalOpen: false, deliveryModalOrder: null }),

  isNewOrderModalOpen: false,
  openNewOrderModal: () => set({ isNewOrderModalOpen: true }),
  closeNewOrderModal: () => set({ isNewOrderModalOpen: false }),

  isTeamModalOpen: false,
  openTeamModal: () => set({ isTeamModalOpen: true }),
  closeTeamModal: () => set({ isTeamModalOpen: false }),

  isEscalateModalOpen: false,
  escalatingOrder: null,
  openEscalateModal: (order) =>
    set({ isEscalateModalOpen: true, escalatingOrder: order }),
  closeEscalateModal: () =>
    set({ isEscalateModalOpen: false, escalatingOrder: null }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  statusFilter: 'ALL',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
