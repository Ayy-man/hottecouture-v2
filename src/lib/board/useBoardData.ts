'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BoardOrder, TaskStage } from './types'

export function useBoardData() {
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  const supabase = createClient()

  console.log('🔧 Board data hook initialized')

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Fetching orders from API...')

      // Use API route which calls RPC with assignment data
      const response = await fetch(`/api/orders?limit=100&ts=${Date.now()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`)
      }

      const result = await response.json()
      const ordersData = result.orders || []

      console.log('📊 Orders API result:', ordersData.length, 'orders')

      // Transform the data to match our BoardOrder interface
      // The API returns garments with services that include assigned_seamstress_id
      const transformedOrders: BoardOrder[] = ordersData.map((order: any) => {
        // Transform garments and services
        const garments = (order.garments || []).map((g: any) => ({
          id: g.garment_id,
          type: g.type || 'Unknown',
          services: (g.services || []).map((s: any) => ({
            id: s.garment_service_id,
            service: s.service ? { name: s.service.name } : undefined,
            custom_service_name: s.custom_service_name,
            custom_price_cents: s.custom_price_cents,
            quantity: s.quantity || 1,
            assigned_seamstress_id: s.assigned_seamstress_id || null,
            assigned_seamstress_name: s.assigned_seamstress_name || null,
            assigned_seamstress_color: s.assigned_seamstress_color || null,
          }))
        }))

        // Build tasks array from garment_services for backward compatibility
        // This allows existing code using order.tasks to continue working
        const tasks = garments.flatMap((g: any) =>
          (g.services || []).map((s: any) => ({
            id: s.id,
            stage: 'pending' as TaskStage, // garment_service doesn't have stage yet, default to pending
            assignee: s.assigned_seamstress_name || undefined, // String name for backward compat
            assigned_seamstress_id: s.assigned_seamstress_id || undefined, // UUID for new code
          }))
        )

        // Calculate services count
        const services_count = garments.reduce((count: number, g: any) =>
          count + (g.services?.length || 0), 0
        )

        return {
          id: order.id,
          order_number: order.order_number,
          type: order.type,
          status: order.status,
          due_date: order.due_date,
          rush: order.rush,
          rack_position: order.rack_position,
          client_name: order.client_name || 'Unknown Client',
          client: {
            first_name: order.client_first_name || '',
            last_name: order.client_last_name || ''
          },
          garments,
          tasks,
          services_count,
        }
      })

      console.log('✅ Transformed orders:', transformedOrders.length)
      setOrders(transformedOrders)
    } catch (err) {
      console.error('❌ Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateOrderStage = useCallback(async (orderId: string, newStage: TaskStage) => {
    try {
      setUpdating(prev => new Set(prev).add(orderId))

      // Update all tasks for this order to the new stage
      const { error: tasksError } = await (supabase as any)
        .from('task')
        .update({ stage: newStage })
        .eq('order_id', orderId)

      if (tasksError) {
        throw new Error(`Failed to update tasks: ${tasksError.message}`)
      }

      // Update order status based on stage
      let newOrderStatus = 'pending'
      if (newStage === 'working') {
        newOrderStatus = 'in_progress'
      } else if (newStage === 'done') {
        newOrderStatus = 'completed'
      } else if (newStage === 'ready') {
        newOrderStatus = 'ready'
      } else if (newStage === 'delivered') {
        newOrderStatus = 'delivered'
      }

      const { error: orderError } = await (supabase as any)
        .from('order')
        .update({ status: newOrderStatus as any })
        .eq('id', orderId)

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`)
      }

      // Refresh the data
      await fetchOrders()
    } catch (err) {
      console.error('Error updating order stage:', err)
      setError(err instanceof Error ? err.message : 'Failed to update order stage')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }, [supabase, fetchOrders])

  const assignOrder = useCallback(async (orderId: string, assignee: string) => {
    try {
      setUpdating(prev => new Set(prev).add(orderId))

      // Update all tasks for this order to assign them to the user
      const { error } = await (supabase as any)
        .from('task')
        .update({ assignee })
        .eq('order_id', orderId)

      if (error) {
        throw new Error(`Failed to assign order: ${error.message}`)
      }

      // Refresh the data
      await fetchOrders()
    } catch (err) {
      console.error('Error assigning order:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign order')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }, [supabase, fetchOrders])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    updating,
    updateOrderStage,
    assignOrder,
    refetch: fetchOrders
  }
}
