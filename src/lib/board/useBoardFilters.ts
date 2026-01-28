'use client'

import { useState, useMemo } from 'react'
import { BoardOrder, BoardFilters } from './types'

export function useBoardFilters(orders: BoardOrder[]) {
  const [filters, setFilters] = useState<BoardFilters>({
    rush: false,
    dueToday: false,
    search: '',
  })

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Rush filter
      if (filters.rush && !order.rush) {
        return false
      }

      // Due today filter
      if (filters.dueToday) {
        const today = new Date().toDateString()
        const dueDate = order.due_date ? new Date(order.due_date).toDateString() : null
        if (dueDate !== today) {
          return false
        }
      }

      // Assignee filter - now supports item-level assignment via UUID
      if (filters.assignedSeamstressId) {
        // Check if ANY garment_service in this order is assigned to this seamstress (by UUID)
        const hasAssignedItem = order.garments?.some(g =>
          g.services?.some(s => s.assigned_seamstress_id === filters.assignedSeamstressId)
        ) || order.tasks.some(t => t.assigned_seamstress_id === filters.assignedSeamstressId)

        if (!hasAssignedItem) {
          return false
        }
      }

      // Keep old string-based filter for backward compatibility
      if (filters.assignee && !filters.assignedSeamstressId) {
        const assignees = order.tasks.map(t => t.assignee).filter(Boolean)
        if (!assignees.includes(filters.assignee)) {
          return false
        }
      }

      // Pipeline filter
      if (filters.pipeline && order.type !== filters.pipeline) {
        return false
      }

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const clientName = (order.client_name || 'Unknown Client').toLowerCase()
        const orderNumber = order.order_number.toString()
        const garmentTypes = (order.garments || []).map(g => g.type).join(' ').toLowerCase()
        
        if (!clientName.includes(searchTerm) && 
            !orderNumber.includes(searchTerm) && 
            !garmentTypes.includes(searchTerm)) {
          return false
        }
      }

      return true
    })
  }, [orders, filters])

  const groupedOrders = useMemo(() => {
    const groups: Record<string, BoardOrder[]> = {
      pending: [],
      working: [],
      done: [],
      ready: [],
      delivered: []
    }

    filteredOrders.forEach(order => {
      // Determine the stage based on the most common task stage
      const taskStages = order.tasks.map(t => t.stage)
      const stageCounts = taskStages.reduce((acc, stage) => {
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Find the most common stage
      const mostCommonStage = Object.entries(stageCounts).reduce((a, b) => 
        (stageCounts[a[0]] || 0) > (stageCounts[b[0]] || 0) ? a : b
      )?.[0] || 'pending'

      // If no tasks, use order status to determine stage
      if (taskStages.length === 0) {
        switch (order.status) {
          case 'pending':
            groups.pending?.push(order)
            break
          case 'working':
            groups.working?.push(order)
            break
          case 'done':
            groups.done?.push(order)
            break
          case 'ready':
            groups.ready?.push(order)
            break
          case 'delivered':
            groups.delivered?.push(order)
            break
          default:
            groups.pending?.push(order)
        }
      } else {
        // Use the most common task stage
        if (mostCommonStage in groups) {
          groups[mostCommonStage as keyof typeof groups]?.push(order)
        } else {
          groups.pending?.push(order)
        }
      }
    })

    return groups
  }, [filteredOrders])

  return {
    filters,
    setFilters,
    filteredOrders,
    groupedOrders
  }
}
