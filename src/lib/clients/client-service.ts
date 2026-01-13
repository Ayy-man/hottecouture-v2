import {
  ClientProfile,
  ClientOrderHistory,
  ClientInteraction,
  ClientAppointment,
  ClientStats,
  ClientSearchFilters,
  ClientListResult,
  calculateLoyaltyTier,
  calculateOrderFrequency,
  validateClientProfile,
} from './client-types';
import { createClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/api/error-handler';

export class ClientService {
  private supabase: any;

  constructor() {
    this.supabase = null;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  async createClient(
    profile: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ClientProfile> {
    const supabase = await this.getSupabase();

    const validation = validateClientProfile(profile);
    if (!validation.isValid) {
      throw new Error(
        `Client validation failed: ${validation.errors.join(', ')}`
      );
    }

    const clientData = {
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('client')
      .insert(clientData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    await logEvent('client', data.id, 'created', {
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
    });

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  async updateClient(
    clientId: string,
    updates: Partial<ClientProfile>
  ): Promise<ClientProfile> {
    const supabase = await this.getSupabase();

    const validation = validateClientProfile(updates);
    if (!validation.isValid) {
      throw new Error(
        `Client validation failed: ${validation.errors.join(', ')}`
      );
    }

    const { data, error } = await supabase
      .from('client')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    await logEvent('client', clientId, 'updated', {
      updatedFields: Object.keys(updates),
    });

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  async getClient(clientId: string): Promise<ClientProfile | null> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('client')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get client: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  async searchClients(
    filters: ClientSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ClientListResult> {
    const supabase = await this.getSupabase();

    let query = supabase.from('client').select('*', { count: 'exact' });

    // Build OR conditions for all search filters
    const orConditions: string[] = [];

    if (filters.name) {
      orConditions.push(`first_name.ilike.%${filters.name}%`);
      orConditions.push(`last_name.ilike.%${filters.name}%`);
    }

    if (filters.email) {
      orConditions.push(`email.ilike.%${filters.email}%`);
    }

    if (filters.phone) {
      orConditions.push(`phone.ilike.%${filters.phone}%`);
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(`Failed to search clients: ${error.message}`);
    }

    const clients =
      data?.map((client: any) => ({
        ...client,
        created_at: new Date(client.created_at),
        updated_at: new Date(client.updated_at),
      })) || [];

    return {
      clients,
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > page * limit,
    };
  }

  async getClientStats(clientId: string): Promise<ClientStats> {
    const supabase = await this.getSupabase();

    // Get order history
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select('id, total_cents, created_at, completed_at, type')
      .eq('client_id', clientId);

    if (ordersError) {
      throw new Error(`Failed to get client orders: ${ordersError.message}`);
    }

    const totalOrders = orders?.length || 0;
    const totalSpent =
      orders?.reduce(
        (sum: number, order: any) => sum + (order.total_cents || 0),
        0
      ) || 0;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const firstOrderDate =
      orders?.length > 0
        ? new Date(
            Math.min(
              ...orders.map((o: any) => new Date(o.created_at).getTime())
            )
          )
        : new Date();

    const lastOrderDate =
      orders?.length > 0
        ? new Date(
            Math.max(
              ...orders.map((o: any) => new Date(o.created_at).getTime())
            )
          )
        : new Date();

    const orderFrequency = calculateOrderFrequency(
      totalOrders,
      firstOrderDate,
      lastOrderDate
    );
    const loyaltyTier = calculateLoyaltyTier({
      total_orders: totalOrders,
      total_spent: totalSpent,
      average_order_value: averageOrderValue,
      last_order_date: lastOrderDate,
      favorite_services: [],
      order_frequency: orderFrequency,
      loyalty_tier: 'bronze',
    });

    // Get favorite services
    const { data: services, error: servicesError } = await supabase
      .from('garment_service')
      .select(
        `
        service:service_id (name),
        quantity,
        custom_price_cents,
        base_price_cents
      `
      )
      .in('order_id', orders?.map((o: any) => o.id) || []);

    if (servicesError) {
      console.warn('Failed to get client services:', servicesError);
    }

    const serviceStats = new Map<
      string,
      { count: number; totalSpent: number }
    >();
    services?.forEach((service: any) => {
      const serviceName = service.service?.name || 'Unknown Service';
      const price = service.custom_price_cents || service.base_price_cents || 0;
      const total = price * service.quantity;

      if (serviceStats.has(serviceName)) {
        const existing = serviceStats.get(serviceName)!;
        serviceStats.set(serviceName, {
          count: existing.count + service.quantity,
          totalSpent: existing.totalSpent + total,
        });
      } else {
        serviceStats.set(serviceName, {
          count: service.quantity,
          totalSpent: total,
        });
      }
    });

    const favoriteServices = Array.from(serviceStats.entries())
      .map(([name, stats]) => ({
        service_name: name,
        count: stats.count,
        total_spent: stats.totalSpent,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_orders: totalOrders,
      total_spent: totalSpent,
      average_order_value: averageOrderValue,
      last_order_date: lastOrderDate,
      favorite_services: favoriteServices,
      order_frequency: orderFrequency,
      loyalty_tier: loyaltyTier,
    };
  }

  async getClientOrderHistory(clientId: string): Promise<ClientOrderHistory[]> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        type,
        status,
        total_cents,
        rush,
        created_at,
        completed_at,
        garments (
          type,
          color,
          brand
        ),
        garment_service (
          service:service_id (name),
          quantity,
          custom_price_cents,
          base_price_cents
        )
      `
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get client order history: ${error.message}`);
    }

    return (
      data?.map((order: any) => ({
        id: order.id,
        client_id: clientId,
        order_id: order.id,
        order_number: order.order_number,
        order_type: order.type,
        status: order.status,
        total_amount: order.total_cents || 0,
        rush: order.rush || false,
        created_at: new Date(order.created_at),
        completed_at: order.completed_at
          ? new Date(order.completed_at)
          : undefined,
        garments:
          order.garments?.map((garment: any) => ({
            type: garment.type,
            color: garment.color,
            brand: garment.brand,
            services:
              order.garment_service
                ?.filter((gs: any) => gs.service?.name)
                .map((gs: any) => ({
                  name: gs.service.name,
                  price: gs.custom_price_cents || gs.base_price_cents || 0,
                  quantity: gs.quantity,
                })) || [],
          })) || [],
      })) || []
    );
  }

  async addClientInteraction(
    interaction: Omit<ClientInteraction, 'id' | 'created_at'>
  ): Promise<ClientInteraction> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('client_interactions')
      .insert({
        ...interaction,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add client interaction: ${error.message}`);
    }

    await logEvent('client', interaction.client_id, 'interaction_added', {
      type: interaction.type,
      subject: interaction.subject,
    });

    return {
      ...data,
      created_at: new Date(data.created_at),
    };
  }

  async getClientInteractions(clientId: string): Promise<ClientInteraction[]> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('client_interactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get client interactions: ${error.message}`);
    }

    return (
      data?.map((interaction: any) => ({
        ...interaction,
        created_at: new Date(interaction.created_at),
      })) || []
    );
  }

  async createClientAppointment(
    appointment: Omit<ClientAppointment, 'id' | 'created_at'>
  ): Promise<ClientAppointment> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('client_appointments')
      .insert({
        ...appointment,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client appointment: ${error.message}`);
    }

    await logEvent('client', appointment.client_id, 'appointment_created', {
      type: appointment.type,
      scheduled_at: appointment.scheduled_at,
    });

    return {
      ...data,
      created_at: new Date(data.created_at),
    };
  }

  async getClientAppointments(clientId: string): Promise<ClientAppointment[]> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('client_appointments')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get client appointments: ${error.message}`);
    }

    return (
      data?.map((appointment: any) => ({
        ...appointment,
        created_at: new Date(appointment.created_at),
      })) || []
    );
  }
}

export const clientService = new ClientService();
