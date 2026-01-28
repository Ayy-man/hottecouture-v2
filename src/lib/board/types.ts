import { Database } from '@/lib/types/database';

export type TaskStage = Database['public']['Tables']['task']['Row']['stage'];
export type OrderStatus =
  Database['public']['Tables']['order']['Row']['status'];
export type OrderType = Database['public']['Tables']['order']['Row']['type'];

export interface BoardOrder {
  id: string;
  order_number: number;
  type: OrderType;
  status: OrderStatus;
  due_date?: string;
  rush: boolean;
  rack_position?: string;
  client_name: string;
  client: {
    first_name: string;
    last_name: string;
  };
  garments: Array<{
    id: string;
    type: string;
    services: Array<{
      id: string;
      service?: {
        name: string;
      };
      custom_service_name?: string;
      custom_price_cents?: number;
      quantity: number;
      assigned_seamstress_id?: string | null;
      assigned_seamstress_name?: string | null;
    }>;
  }>;
  tasks: Array<{
    id: string;
    stage: TaskStage;
    assignee?: string;
    assigned_seamstress_id?: string; // UUID for item-level assignment
  }>;
  services_count: number;
}

export interface BoardFilters {
  rush: boolean;
  dueToday: boolean;
  assignee?: string; // Keep for backward compatibility (string name)
  assignedSeamstressId?: string; // New: UUID-based filtering for item-level assignment
  pipeline?: OrderType;
  search: string;
}

export interface OrderWithTasks {
  id: string;
  status: OrderStatus;
  tasks: Array<{
    id: string;
    stage: TaskStage;
    order_id: string;
  }>;
}
