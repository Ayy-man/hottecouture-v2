'use client'

import { useState, useCallback, useMemo } from 'react'
import { PricingItem, PricingCalculation, PricingConfig } from './types'
import { calculateOrderPricing, getPricingConfig, validatePricingConfig } from './calcTotal'

interface UsePricingOptions {
  initialItems?: PricingItem[]
  isRush?: boolean
  config?: Partial<PricingConfig>
}

interface UsePricingReturn {
  items: PricingItem[]
  isRush: boolean
  calculation: PricingCalculation | null
  config: PricingConfig
  isValid: boolean
  errors: string[]
  addItem: (item: PricingItem) => void
  updateItem: (garmentId: string, serviceId: string, updates: Partial<PricingItem>) => void
  removeItem: (garmentId: string, serviceId: string) => void
  setRush: (isRush: boolean) => void
  updateConfig: (newConfig: Partial<PricingConfig>) => void
  recalculate: () => void
  clear: () => void
}

export function usePricing(options: UsePricingOptions = {}): UsePricingReturn {
  const [items, setItems] = useState<PricingItem[]>(options.initialItems || [])
  const [isRush, setIsRush] = useState(options.isRush || false)
  const [config, setConfig] = useState<PricingConfig>(() => ({
    ...getPricingConfig(),
    ...options.config,
  }))

  const calculation = useMemo(() => {
    if (items.length === 0) return null

    return calculateOrderPricing({
      order_id: 'temp',
      is_rush: isRush,
      items,
      config,
    })
  }, [items, isRush, config])

  const { isValid, errors } = useMemo(() => {
    return validatePricingConfig(config)
  }, [config])

  const addItem = useCallback((item: PricingItem) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.garment_id === item.garment_id && i.service_id === item.service_id
      )
      
      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], ...item }
        return updated
      } else {
        // Add new item
        return [...prev, item]
      }
    })
  }, [])

  const updateItem = useCallback((
    garmentId: string,
    serviceId: string,
    updates: Partial<PricingItem>
  ) => {
    setItems(prev => 
      prev.map(item => 
        item.garment_id === garmentId && item.service_id === serviceId
          ? { ...item, ...updates }
          : item
      )
    )
  }, [])

  const removeItem = useCallback((garmentId: string, serviceId: string) => {
    setItems(prev => 
      prev.filter(item => 
        !(item.garment_id === garmentId && item.service_id === serviceId)
      )
    )
  }, [])

  const setRush = useCallback((newIsRush: boolean) => {
    setIsRush(newIsRush)
  }, [])

  const updateConfig = useCallback((newConfig: Partial<PricingConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  const recalculate = useCallback(() => {
    // Force recalculation by updating a dependency
    setItems(prev => [...prev])
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setIsRush(false)
  }, [])

  return {
    items,
    isRush,
    calculation,
    config,
    isValid,
    errors,
    addItem,
    updateItem,
    removeItem,
    setRush,
    updateConfig,
    recalculate,
    clear,
  }
}
