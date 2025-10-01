'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { storageService } from '@/lib/storage'

interface NotesData {
  measurements?: string
  specialInstructions?: string
  documents: File[]
  additionalPhotos: File[]
}

interface NotesStepProps {
  data: NotesData
  onUpdate: (notes: NotesData) => void
  onNext: () => void
  onPrev: () => void
}

export function NotesStep({ data, onUpdate, onNext, onPrev }: NotesStepProps) {
  const t = useTranslations('intake.notes')
  const [isUploading, setIsUploading] = useState(false)

  const handleInputChange = (field: keyof NotesData, value: string) => {
    onUpdate({ ...data, [field]: value })
  }

  const handleFileUpload = async (files: FileList, type: 'documents' | 'additionalPhotos') => {
    setIsUploading(true)
    try {
      const uploadedFiles: File[] = []
      
      for (const file of Array.from(files)) {
        // Validate file type
        const isValidType = storageService.validateFileType(file, 'docs')
        if (!isValidType) {
          console.warn(`Invalid file type: ${file.name}`)
          continue
        }

        // Check file size
        const maxSize = storageService.getMaxFileSize('docs')
        if (file.size > maxSize) {
          console.warn(`File too large: ${file.name}`)
          continue
        }

        uploadedFiles.push(file)
      }

      onUpdate({
        ...data,
        [type]: [...data[type], ...uploadedFiles]
      })
    } catch (error) {
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (type: 'documents' | 'additionalPhotos', index: number) => {
    const updatedFiles = [...data[type]]
    updatedFiles.splice(index, 1)
    onUpdate({ ...data, [type]: updatedFiles })
  }

  return (
    <div className="space-y-6">
      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>{t('measurements')}</CardTitle>
          <CardDescription>
            Record any measurements or sizing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={data.measurements || ''}
            onChange={(e) => handleInputChange('measurements', e.target.value)}
            rows={6}
            placeholder="Enter measurements, sizing notes, or any relevant details..."
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('specialInstructions')}</CardTitle>
          <CardDescription>
            Any special instructions or requirements for this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={data.specialInstructions || ''}
            onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
            rows={4}
            placeholder="Enter any special instructions, preferences, or requirements..."
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle>{t('uploadDocuments')}</CardTitle>
          <CardDescription>
            Upload any relevant documents (PDF, DOC, TXT)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'documents')}
                disabled={isUploading}
                className="hidden"
                id="document-upload"
              />
              <label
                htmlFor="document-upload"
                className="cursor-pointer block"
              >
                <div className="text-gray-600 mb-2">
                  {isUploading ? 'Uploading...' : 'Click to upload documents'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  className="py-3 px-6 text-lg"
                >
                  Choose Files
                </Button>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PDF, DOC, DOCX, TXT files up to 20MB
              </p>
            </div>

            {/* Uploaded documents */}
            {data.documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Uploaded Documents:</h4>
                {data.documents.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFile('documents', index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Photos Upload */}
      <Card>
        <CardHeader>
          <CardTitle>{t('uploadPhotos')}</CardTitle>
          <CardDescription>
            Upload additional photos if needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'additionalPhotos')}
                disabled={isUploading}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer block"
              >
                <div className="text-gray-600 mb-2">
                  {isUploading ? 'Uploading...' : 'Click to upload photos'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  className="py-3 px-6 text-lg"
                >
                  Choose Photos
                </Button>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG, WebP, GIF files up to 10MB each
              </p>
            </div>

            {/* Uploaded photos */}
            {data.additionalPhotos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Uploaded Photos:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {data.additionalPhotos.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Additional photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => removeFile('additionalPhotos', index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
