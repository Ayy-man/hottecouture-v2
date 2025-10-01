'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Service } from '@/lib/types/database'
import { formatCurrency } from '@/lib/pricing'

interface Garment {
  type: string
  color?: string
  brand?: string
  notes?: string
  photoPath?: string
  labelCode: string
  services: Array<{
    serviceId: string
    qty: number
    customPriceCents?: number
  }>
}

interface ServicesStepProps {
  data: Garment[]
  onUpdate: (garments: Garment[]) => void
  onNext: () => void
  onPrev: () => void
}

export function ServicesStep({ data, onUpdate, onNext, onPrev }: ServicesStepProps) {
  const t = useTranslations('intake.services')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [subtotal, setSubtotal] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    calculateSubtotal()
  }, [data])

  const loadServices = async () => {
    try {
      const { data: servicesData, error } = await supabase
        .from('service')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error loading services:', error)
        return
      }

      setServices(servicesData || [])
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSubtotal = () => {
    let total = 0
    data.forEach(garment => {
      garment.services.forEach(service => {
        const serviceData = services.find(s => s.id === service.serviceId)
        if (serviceData) {
          const price = service.customPriceCents || serviceData.base_price_cents
          total += price * service.qty
        }
      })
    })
    setSubtotal(total)
  }

  const addServiceToGarment = (garmentIndex: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const updatedGarments = [...data]
    const garment = updatedGarments[garmentIndex]
    
    // Check if service already exists
    const existingServiceIndex = garment.services.findIndex(s => s.serviceId === serviceId)
    
    if (existingServiceIndex >= 0) {
      // Update quantity
      garment.services[existingServiceIndex].qty += 1
    } else {
      // Add new service
      garment.services.push({
        serviceId,
        qty: 1,
      })
    }

    onUpdate(updatedGarments)
  }

  const updateServiceQuantity = (garmentIndex: number, serviceIndex: number, qty: number) => {
    if (qty <= 0) return

    const updatedGarments = [...data]
    updatedGarments[garmentIndex].services[serviceIndex].qty = qty
    onUpdate(updatedGarments)
  }

  const updateServicePrice = (garmentIndex: number, serviceIndex: number, customPriceCents?: number) => {
    const updatedGarments = [...data]
    updatedGarments[garmentIndex].services[serviceIndex].customPriceCents = customPriceCents
    onUpdate(updatedGarments)
  }

  const removeService = (garmentIndex: number, serviceIndex: number) => {
    const updatedGarments = [...data]
    updatedGarments[garmentIndex].services.splice(serviceIndex, 1)
    onUpdate(updatedGarments)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Services list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectServices')}</CardTitle>
          <CardDescription>
            Select services for each garment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <div
                key={service.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <h4 className="font-medium">{service.name}</h4>
                <p className="text-sm text-gray-600">{service.category}</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(service.base_price_cents)}
                </p>
                {service.is_custom && (
                  <p className="text-xs text-orange-600">Custom pricing available</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Garments with their services */}
      {data.map((garment, garmentIndex) => (
        <Card key={garmentIndex}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{garment.type}</span>
              <span className="text-sm font-normal text-gray-600">
                {garment.labelCode}
              </span>
            </CardTitle>
            <CardDescription>
              {garment.color && `Color: ${garment.color}`}
              {garment.color && garment.brand && ' • '}
              {garment.brand && `Brand: ${garment.brand}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add service dropdown */}
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addServiceToGarment(garmentIndex, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Add a service...</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {formatCurrency(service.base_price_cents)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected services */}
            {garment.services.length > 0 ? (
              <div className="space-y-2">
                {garment.services.map((service, serviceIndex) => {
                  const serviceData = services.find(s => s.id === service.serviceId)
                  if (!serviceData) return null

                  const unitPrice = service.customPriceCents || serviceData.base_price_cents
                  const totalPrice = unitPrice * service.qty

                  return (
                    <div
                      key={serviceIndex}
                      className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{serviceData.name}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div>
                            <label className="text-sm text-gray-600">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={service.qty}
                              onChange={(e) => updateServiceQuantity(garmentIndex, serviceIndex, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Unit Price</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                value={service.customPriceCents || ''}
                                onChange={(e) => updateServicePrice(garmentIndex, serviceIndex, parseInt(e.target.value) || undefined)}
                                placeholder={serviceData.base_price_cents.toString()}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-xs text-gray-500">cents</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(totalPrice)}</div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(unitPrice)} × {service.qty}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeService(garmentIndex, serviceIndex)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                {t('noServices')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Subtotal */}
      {subtotal > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-primary">Current Subtotal</h3>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(subtotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="flex-1 py-3 text-lg"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex-1 py-3 text-lg"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
