'use client'

import { useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import Webcam from 'react-webcam'

interface CameraCaptureProps {
  onCapture: (photoBlob: Blob) => void
  onCancel: () => void
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const capture = useCallback(() => {
    if (!webcamRef.current) return

    setIsCapturing(true)
    const imageSrc = webcamRef.current.getScreenshot()
    
    if (imageSrc) {
      // Convert data URL to blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob)
        })
        .catch(error => {
          console.error('Error capturing photo:', error)
        })
        .finally(() => {
          setIsCapturing(false)
        })
    }
  }, [onCapture])

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment' // Use back camera on mobile
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="w-full rounded-lg"
        />
        {isCapturing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-lg">Capturing...</div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 py-3 text-lg"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={capture}
          disabled={isCapturing}
          className="flex-1 py-3 text-lg"
        >
          {isCapturing ? 'Capturing...' : 'Take Photo'}
        </Button>
      </div>
    </div>
  )
}
