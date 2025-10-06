'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Ruler, Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { 
  MeasurementSet, 
  MeasurementPoint, 
  getMeasurementTemplate, 
  validateMeasurements,
  convertMeasurements 
} from '@/lib/measurements/measurement-types'

interface MeasurementCaptureProps {
  garmentType: string
  garmentId: string
  onSave: (measurements: MeasurementSet) => void
  onCancel: () => void
  initialMeasurements?: MeasurementSet
  className?: string
}

export function MeasurementCapture({
  garmentType,
  garmentId: _garmentId,
  onSave,
  onCancel,
  initialMeasurements,
  className = ''
}: MeasurementCaptureProps) {
  const [measurements, setMeasurements] = useState<MeasurementSet | null>(null)
  const [unit, setUnit] = useState<'inches' | 'centimeters'>('inches')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialMeasurements) {
      setMeasurements(initialMeasurements)
      setUnit(initialMeasurements.points[0]?.unit || 'inches')
    } else {
      const template = getMeasurementTemplate(garmentType)
      const newMeasurements: MeasurementSet = {
        id: crypto.randomUUID(),
        name: `${garmentType} Measurements`,
        description: `Measurements for ${garmentType}`,
        garmentType,
        points: template.points.map(point => ({
          ...point,
          notes: ''
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setMeasurements(newMeasurements)
    }
  }, [garmentType, initialMeasurements])

  const updateMeasurement = (pointId: string, value: number | undefined, notes?: string) => {
    if (!measurements) return

    const updatedPoints: MeasurementPoint[] = measurements.points.map(point => 
      point.id === pointId 
        ? { 
            ...point, 
            value: value !== undefined ? value : point.value,
            notes: notes !== undefined ? notes : point.notes 
          }
        : point
    )

    setMeasurements({
      ...measurements,
      points: updatedPoints,
      updatedAt: new Date()
    })
  }

  const convertUnit = (newUnit: 'inches' | 'centimeters') => {
    if (!measurements || unit === newUnit) return

    const converted = convertMeasurements(measurements, newUnit)
    setMeasurements(converted)
    setUnit(newUnit)
  }

  const validateAndSave = async () => {
    if (!measurements) return

    setIsValidating(true)
    const validation = validateMeasurements(measurements)
    setValidationErrors(validation.errors)

    if (!validation.isValid) {
      setIsValidating(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(measurements)
    } catch (error) {
      console.error('Failed to save measurements:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const resetMeasurements = () => {
    const template = getMeasurementTemplate(garmentType)
    const resetMeasurements: MeasurementSet = {
      id: measurements?.id || crypto.randomUUID(),
      name: `${garmentType} Measurements`,
      description: `Measurements for ${garmentType}`,
      garmentType,
      points: template.points.map(point => ({
        ...point,
        value: undefined,
        notes: ''
      })),
      createdAt: measurements?.createdAt || new Date(),
      updatedAt: new Date()
    }
    setMeasurements(resetMeasurements)
    setValidationErrors([])
  }

  if (!measurements) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const requiredPoints = measurements.points.filter(p => p.isRequired)
  const optionalPoints = measurements.points.filter(p => !p.isRequired)
  const completedRequired = requiredPoints.filter(p => p.value !== undefined).length
  const totalRequired = requiredPoints.length

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ruler className="w-5 h-5" />
            <span>Measurements for {garmentType}</span>
          </CardTitle>
          <CardDescription>
            Capture detailed measurements for accurate alterations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="unit-select">Unit:</Label>
                <select
                  id="unit-select"
                  value={unit}
                  onChange={(e) => convertUnit(e.target.value as 'inches' | 'centimeters')}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="inches">Inches</option>
                  <option value="centimeters">Centimeters</option>
                </select>
              </div>
              <Badge variant={completedRequired === totalRequired ? "default" : "secondary"}>
                {completedRequired}/{totalRequired} Required
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetMeasurements}
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Required Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Measurements</CardTitle>
          <CardDescription>
            These measurements are essential for accurate alterations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredPoints.map((point) => (
            <MeasurementInput
              key={point.id}
              point={point}
              value={point.value}
              notes={point.notes}
              unit={unit}
              onChange={(value, notes) => updateMeasurement(point.id, value, notes)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Optional Measurements */}
      {optionalPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optional Measurements</CardTitle>
            <CardDescription>
              Additional measurements for more precise fitting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {optionalPoints.map((point) => (
              <MeasurementInput
                key={point.id}
                point={point}
                value={point.value}
                notes={point.notes}
                unit={unit}
                onChange={(value, notes) => updateMeasurement(point.id, value, notes)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          {completedRequired === totalRequired ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              All required measurements completed
            </div>
          ) : (
            `${totalRequired - completedRequired} required measurements remaining`
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={validateAndSave}
            disabled={isSaving || completedRequired < totalRequired}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Save Measurements
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface MeasurementInputProps {
  point: MeasurementPoint
  value?: number
  notes?: string
  unit: 'inches' | 'centimeters'
  onChange: (value: number | undefined, notes?: string) => void
}

function MeasurementInput({ point, value, notes, unit, onChange }: MeasurementInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '')
  const [localNotes, setLocalNotes] = useState(notes || '')

  useEffect(() => {
    setLocalValue(value?.toString() || '')
  }, [value])

  useEffect(() => {
    setLocalNotes(notes || '')
  }, [notes])

  const handleValueChange = (inputValue: string) => {
    setLocalValue(inputValue)
    const numValue = parseFloat(inputValue)
    onChange(isNaN(numValue) ? undefined : numValue, localNotes)
  }

  const handleNotesChange = (inputNotes: string) => {
    setLocalNotes(inputNotes)
    const numValue = parseFloat(localValue)
    onChange(isNaN(numValue) ? undefined : numValue, inputNotes)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`measurement-${point.id}`} className="font-medium">
          {point.name}
          {point.isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Badge variant="outline" className="text-xs">
          {point.category}
        </Badge>
      </div>
      <p className="text-sm text-gray-600">{point.description}</p>
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <Input
            id={`measurement-${point.id}`}
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`Enter measurement in ${unit}`}
            className="text-right"
          />
        </div>
        <div className="text-sm text-gray-500 min-w-[60px]">
          {unit}
        </div>
      </div>
      <Textarea
        placeholder="Additional notes (optional)"
        value={localNotes}
        onChange={(e) => handleNotesChange(e.target.value)}
        rows={2}
        className="text-sm"
      />
    </div>
  )
}
