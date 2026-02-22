export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      client: {
        Row: {
          id: string;
          created_at: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          preferred_contact: 'sms' | 'email' | 'phone';
          newsletter_consent: boolean;
          language: 'fr' | 'en';
          ghl_contact_id: string | null;
          notes: string | null;
          mobile_phone: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          email?: string | null;
          preferred_contact?: 'sms' | 'email' | 'phone';
          newsletter_consent?: boolean;
          language?: 'fr' | 'en';
          ghl_contact_id?: string | null;
          notes?: string | null;
          mobile_phone?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          email?: string | null;
          preferred_contact?: 'sms' | 'email' | 'phone';
          newsletter_consent?: boolean;
          language?: 'fr' | 'en';
          ghl_contact_id?: string | null;
          notes?: string | null;
          mobile_phone?: string | null;
        };
      };
      document: {
        Row: {
          id: string;
          order_id: string;
          kind: string;
          path: string;
          meta: Json | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          kind: string;
          path: string;
          meta?: Json | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          kind?: string;
          path?: string;
          meta?: Json | null;
        };
      };
      event_log: {
        Row: {
          id: number;
          created_at: string;
          actor: string | null;
          entity: string;
          entity_id: string;
          action: string;
          details: Json | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          actor?: string | null;
          entity: string;
          entity_id: string;
          action: string;
          details?: Json | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          actor?: string | null;
          entity?: string;
          entity_id?: string;
          action?: string;
          details?: Json | null;
        };
      };
      garment: {
        Row: {
          id: string;
          order_id: string;
          type: string;
          garment_type_id: string | null;
          color: string | null;
          brand: string | null;
          notes: string | null;
          photo_path: string | null;
          position_notes: Json | null;
          label_code: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          type: string;
          garment_type_id?: string | null;
          color?: string | null;
          brand?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          position_notes?: Json | null;
          label_code?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          type?: string;
          garment_type_id?: string | null;
          color?: string | null;
          brand?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          position_notes?: Json | null;
          label_code?: string | null;
        };
      };
      garment_service: {
        Row: {
          id: string;
          garment_id: string;
          service_id: string | null;
          custom_service_name: string | null;
          quantity: number;
          custom_price_cents: number | null;
          final_price_cents: number | null;
          notes: string | null;
          assigned_seamstress_id: string | null;
          estimated_minutes: number | null;
        };
        Insert: {
          id?: string;
          garment_id: string;
          service_id?: string | null;
          custom_service_name?: string | null;
          quantity?: number;
          custom_price_cents?: number | null;
          final_price_cents?: number | null;
          notes?: string | null;
          assigned_seamstress_id?: string | null;
          estimated_minutes?: number | null;
        };
        Update: {
          id?: string;
          garment_id?: string;
          service_id?: string | null;
          custom_service_name?: string | null;
          quantity?: number;
          custom_price_cents?: number | null;
          final_price_cents?: number | null;
          notes?: string | null;
          assigned_seamstress_id?: string | null;
          estimated_minutes?: number | null;
        };
      };
      price_change_log: {
        Row: {
          id: string;
          created_at: string;
          garment_service_id: string;
          order_id: string;
          changed_by: string;
          old_price_cents: number | null;
          new_price_cents: number;
          reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          garment_service_id: string;
          order_id: string;
          changed_by: string;
          old_price_cents?: number | null;
          new_price_cents: number;
          reason?: string | null;
        };
        Update: {
          // Audit logs should not be updated - minimal fields
          id?: string;
        };
      };
      order: {
        Row: {
          id: string;
          created_at: string;
          client_id: string;
          order_number: number;
          type: 'alteration' | 'custom';
          priority: 'normal' | 'rush' | 'custom';
          status:
            | 'pending'
            | 'working'
            | 'done'
            | 'ready'
            | 'delivered'
            | 'archived';
          due_date: string | null;
          rush: boolean;
          rush_fee_cents: number;
          subtotal_cents: number;
          tax_cents: number;
          tps_cents: number;
          tvq_cents: number;
          total_cents: number;
          deposit_cents: number;
          balance_due_cents: number;
          qrcode: string | null;
          rack_position: string | null;
          ghl_opportunity_id: string | null;
          is_archived: boolean;
          archived_at: string | null;
          archived_by: string | null;
          assigned_to: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          client_id: string;
          order_number?: number;
          type: 'alteration' | 'custom';
          priority?: 'normal' | 'rush' | 'custom';
          status?:
            | 'pending'
            | 'working'
            | 'done'
            | 'ready'
            | 'delivered'
            | 'archived';
          due_date?: string | null;
          rush?: boolean;
          rush_fee_cents?: number;
          subtotal_cents?: number;
          tax_cents?: number;
          tps_cents?: number;
          tvq_cents?: number;
          total_cents?: number;
          deposit_cents?: number;
          qrcode?: string | null;
          rack_position?: string | null;
          ghl_opportunity_id?: string | null;
          is_archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          assigned_to?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          client_id?: string;
          order_number?: number;
          type?: 'alteration' | 'custom';
          priority?: 'normal' | 'rush' | 'custom';
          status?:
            | 'pending'
            | 'working'
            | 'done'
            | 'ready'
            | 'delivered'
            | 'archived';
          due_date?: string | null;
          rush?: boolean;
          rush_fee_cents?: number;
          subtotal_cents?: number;
          tax_cents?: number;
          tps_cents?: number;
          tvq_cents?: number;
          total_cents?: number;
          deposit_cents?: number;
          qrcode?: string | null;
          rack_position?: string | null;
          ghl_opportunity_id?: string | null;
          is_archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          assigned_to?: string | null;
        };
      };
      price_list: {
        Row: {
          id: string;
          code: string;
          name: string;
          default_price_cents: number;
          effective_from: string;
          effective_to: string | null;
          type: 'alteration' | 'custom';
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          default_price_cents: number;
          effective_from: string;
          effective_to?: string | null;
          type: 'alteration' | 'custom';
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          default_price_cents?: number;
          effective_from?: string;
          effective_to?: string | null;
          type?: 'alteration' | 'custom';
        };
      };
      service: {
        Row: {
          id: string;
          code: string;
          name: string;
          base_price_cents: number;
          category: string | null;
          unit: string | null;
          is_custom: boolean;
          display_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          base_price_cents: number;
          category?: string | null;
          unit?: string | null;
          is_custom?: boolean;
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          base_price_cents?: number;
          category?: string | null;
          unit?: string | null;
          is_custom?: boolean;
          display_order?: number;
          is_active?: boolean;
        };
      };
      category: {
        Row: {
          id: string;
          key: string;
          name: string;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      garment_type: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: string;
          icon: string | null;
          is_common: boolean;
          is_active: boolean;
          is_custom: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category: string;
          icon?: string | null;
          is_common?: boolean;
          is_active?: boolean;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          category?: string;
          icon?: string | null;
          is_common?: boolean;
          is_active?: boolean;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      task: {
        Row: {
          id: string;
          garment_id: string;
          stage: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
          operation: string;
          assignee: string | null;
          planned_minutes: number | null;
          actual_minutes: number | null;
          started_at: string | null;
          stopped_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          garment_id: string;
          stage?: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
          operation: string;
          assignee?: string | null;
          planned_minutes?: number | null;
          actual_minutes?: number | null;
          started_at?: string | null;
          stopped_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          garment_id?: string;
          stage?: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
          operation?: string;
          assignee?: string | null;
          planned_minutes?: number | null;
          actual_minutes?: number | null;
          started_at?: string | null;
          stopped_at?: string | null;
          is_active?: boolean;
        };
      };
      measurement_template: {
        Row: {
          id: string;
          name: string;
          name_fr: string;
          category: string;
          unit: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_fr: string;
          category?: string;
          unit?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_fr?: string;
          category?: string;
          unit?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      client_measurement: {
        Row: {
          id: string;
          client_id: string;
          template_id: string;
          value: number | null;
          notes: string | null;
          measured_at: string;
          measured_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          template_id: string;
          value?: number | null;
          notes?: string | null;
          measured_at?: string;
          measured_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          template_id?: string;
          value?: number | null;
          notes?: string | null;
          measured_at?: string;
          measured_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_measurement: {
        Row: {
          id: string;
          order_id: string;
          template_id: string;
          value: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          template_id: string;
          value?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          template_id?: string;
          value?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          pin_hash: string | null;
          last_clock_in: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          pin_hash?: string | null;
          last_clock_in?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          pin_hash?: string | null;
          last_clock_in?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      language: 'fr' | 'en';
      order_status:
        | 'pending'
        | 'working'
        | 'done'
        | 'ready'
        | 'delivered'
        | 'archived';
      order_type: 'alteration' | 'custom';
      preferred_contact: 'sms' | 'email' | 'phone';
      price_list_type: 'alteration' | 'custom';
      priority: 'normal' | 'rush' | 'custom';
      task_stage: 'pending' | 'working' | 'done' | 'ready' | 'delivered';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for common operations
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Specific table types
export type Client = Tables<'client'>;
export type Order = Tables<'order'>;
export type Garment = Tables<'garment'>;
export type Service = Tables<'service'>;
export type GarmentService = Tables<'garment_service'>;
export type Task = Tables<'task'>;
export type PriceList = Tables<'price_list'>;
export type Document = Tables<'document'>;
export type EventLog = Tables<'event_log'>;
export type MeasurementTemplate = Tables<'measurement_template'>;
export type ClientMeasurement = Tables<'client_measurement'>;
export type OrderMeasurement = Tables<'order_measurement'>;
export type Staff = Tables<'staff'>;

// Insert types
export type ClientInsert = Database['public']['Tables']['client']['Insert'];
export type OrderInsert = Database['public']['Tables']['order']['Insert'];
export type GarmentInsert = Database['public']['Tables']['garment']['Insert'];
export type ServiceInsert = Database['public']['Tables']['service']['Insert'];
export type GarmentServiceInsert =
  Database['public']['Tables']['garment_service']['Insert'];
export type TaskInsert = Database['public']['Tables']['task']['Insert'];
export type PriceListInsert =
  Database['public']['Tables']['price_list']['Insert'];
export type DocumentInsert = Database['public']['Tables']['document']['Insert'];
export type EventLogInsert =
  Database['public']['Tables']['event_log']['Insert'];
export type MeasurementTemplateInsert =
  Database['public']['Tables']['measurement_template']['Insert'];
export type ClientMeasurementInsert =
  Database['public']['Tables']['client_measurement']['Insert'];
export type OrderMeasurementInsert =
  Database['public']['Tables']['order_measurement']['Insert'];
export type StaffInsert = Database['public']['Tables']['staff']['Insert'];
export type PriceChangeLog = Tables<'price_change_log'>;
export type PriceChangeLogInsert =
  Database['public']['Tables']['price_change_log']['Insert'];

// Update types
export type ClientUpdate = Database['public']['Tables']['client']['Update'];
export type OrderUpdate = Database['public']['Tables']['order']['Update'];
export type GarmentUpdate = Database['public']['Tables']['garment']['Update'];
export type ServiceUpdate = Database['public']['Tables']['service']['Update'];
export type GarmentServiceUpdate =
  Database['public']['Tables']['garment_service']['Update'];
export type TaskUpdate = Database['public']['Tables']['task']['Update'];
export type PriceListUpdate =
  Database['public']['Tables']['price_list']['Update'];
export type DocumentUpdate = Database['public']['Tables']['document']['Update'];
export type EventLogUpdate =
  Database['public']['Tables']['event_log']['Update'];
export type MeasurementTemplateUpdate =
  Database['public']['Tables']['measurement_template']['Update'];
export type ClientMeasurementUpdate =
  Database['public']['Tables']['client_measurement']['Update'];
export type OrderMeasurementUpdate =
  Database['public']['Tables']['order_measurement']['Update'];
export type StaffUpdate = Database['public']['Tables']['staff']['Update'];

// Notification and Chat Log types (Agent C)
export type NotificationLog = {
  id: string;
  order_id: string | null;
  client_id: string | null;
  type: 'sms' | 'email' | 'push';
  template: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  external_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type NotificationLogInsert = Omit<NotificationLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ChatLog = {
  id: string;
  session_id: string;
  type: 'internal' | 'external';
  query: string;
  response: string;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type ChatLogInsert = Omit<ChatLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// Enum types
export type Language = Enums<'language'>;
export type OrderStatus = Enums<'order_status'>;
export type OrderType = Enums<'order_type'>;
export type PreferredContact = Enums<'preferred_contact'>;
export type PriceListType = Enums<'price_list_type'>;
export type Priority = Enums<'priority'>;
export type TaskStage = Enums<'task_stage'>;
