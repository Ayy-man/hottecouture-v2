'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CameraCapture } from '@/components/intake/camera-capture'
import { storageService } from '@/lib/storage'
import { nanoid } from 'nanoid'

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

interface GarmentsStepProps {
  data: Garment[]
  onUpdate: (garments: Garment[]) => void
  onNext: () => void
  onPrev: () => void
}

export function GarmentsStep({ data, onUpdate, onNext, onPrev }: GarmentsStepProps) {
  const t = useTranslations('intake.garments')
  const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
    type: '',
    color: '',
    brand: '',
    notes: '',
    labelCode: nanoid(8).toUpperCase(),
    services: [],
  })
  const [showCamera, setShowCamera] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const addGarment = () => {
    if (!currentGarment.type) return

    const newGarment: Garment = {
      type: currentGarment.type,
      color: currentGarment.color,
      brand: currentGarment.brand,
      notes: currentGarment.notes,
      photoPath: currentGarment.photoPath,
      labelCode: currentGarment.labelCode || nanoid(8).toUpperCase(),
      services: currentGarment.services || [],
    }

    onUpdate([...data, newGarment])
    setCurrentGarment({
      type: '',
      color: '',
      brand: '',
      notes: '',
      labelCode: nanoid(8).toUpperCase(),
      services: [],
    })
  }

  const removeGarment = (index: number) => {
    const updatedGarments = data.filter((_, i) => i !== index)
    onUpdate(updatedGarments)
  }

  const handlePhotoCapture = async (photoBlob: Blob) => {
    setIsUploading(true)
    try {
      const fileName = `garments/${nanoid()}.jpg`
      const file = new File([photoBlob], fileName, { type: 'image/jpeg' })
      
      const result = await storageService.uploadFile({
        bucket: 'photos',
        path: fileName,
        file,
        options: { upsert: false }
      })

      setCurrentGarment(prev => ({
        ...prev,
        photoPath: result.path
      }))
    } catch (error) {
      console.error('Failed to upload photo:', error)
    } finally {
      setIsUploading(false)
      setShowCamera(false)
    }
  }

  const handleInputChange = (field: keyof Garment, value: string) => {
    setCurrentGarment(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Add new garment form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('addGarment')}</CardTitle>
          <CardDescription>
            Add garment details and take a photo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('type')} *
              </label>
              <input
                type="text"
                value={currentGarment.type || ''}
                onChange={(e) => handleInputChange('type', e.target.value)}
                placeholder="e.g., Dress, Suit, Pants"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('color')}
              </label>
              <input
                type="text"
                value={currentGarment.color || ''}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="e.g., Black, Navy, Red"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('brand')}
              </label>
              <input
                type="text"
                value={currentGarment.brand || ''}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="e.g., Chanel, Zara, Custom"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('labelCode')}
              </label>
              <input
                type="text"
                value={currentGarment.labelCode || ''}
                onChange={(e) => handleInputChange('labelCode', e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('notes')}
            </label>
            <textarea
              value={currentGarment.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              placeholder="Special instructions, damage notes, etc."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Photo section */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('photo')}
            </label>
            <div className="space-y-4">
              {currentGarment.photoPath ? (
                <div className="relative">
                  <img
                    src={currentGarment.photoPath}
                    alt="Garment photo"
                    className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300"
                  />
                  <div className="absolute top-2 right-2 space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                    >
                      {t('retakePhoto')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setCurrentGarment(prev => ({ ...prev, photoPath: undefined }))}
                    >
                      {t('removePhoto')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No photo taken yet</p>
                  <Button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={isUploading}
                    className="py-3 px-6 text-lg"
                  >
                    {isUploading ? 'Uploading...' : t('takePhoto')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={addGarment}
              disabled={!currentGarment.type}
              className="flex-1 py-3 text-lg"
            >
              Add Garment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera capture modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Take Photo</h3>
            <CameraCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setShowCamera(false)}
            />
          </div>
        </div>
      )}

      {/* Garments list */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Garments ({data.length})</CardTitle>
            <CardDescription>
              Review and manage added garments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((garment, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                >
                  {garment.photoPath && (
                    <img
                      src={garment.photoPath}
                      alt={garment.type}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{garment.type}</h4>
                    <p className="text-sm text-gray-600">
                      {garment.color && `Color: ${garment.color}`}
                      {garment.color && garment.brand && ' • '}
                      {garment.brand && `Brand: ${garment.brand}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Label: {garment.labelCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeGarment(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
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
          disabled={data.length === 0}
          className="flex-1 py-3 text-lg"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
