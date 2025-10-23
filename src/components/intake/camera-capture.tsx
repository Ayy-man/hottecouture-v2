'use client';

import { useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string, fileName: string) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();

    if (imageSrc) {
      const fileName = `garment-${Date.now()}.jpg`;
      onCapture(imageSrc, fileName);
      setIsCapturing(false);
      setShowCamera(false);
    }
  }, [onCapture]);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment', // Use back camera on mobile
  };

  if (!showCamera) {
    return (
      <div className='space-y-3'>
        <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center'>
          <div className='text-4xl mb-3'>📷</div>
          <p className='text-sm text-gray-600 mb-3'>
            Add a photo of the garment
          </p>
          <Button
            type='button'
            onClick={() => setShowCamera(true)}
            className='w-full py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200'
          >
            Take Photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat='image/jpeg'
          videoConstraints={videoConstraints}
          className='w-full rounded-lg'
        />
        {isCapturing && (
          <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg'>
            <div className='text-white text-lg'>Capturing...</div>
          </div>
        )}
      </div>

      <div className='flex space-x-2'>
        {onCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            className='flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200'
          >
            Cancel
          </Button>
        )}
        <Button
          type='button'
          variant='outline'
          onClick={() => setShowCamera(false)}
          className='flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200'
        >
          Back
        </Button>
        <Button
          type='button'
          onClick={capture}
          disabled={isCapturing}
          className='flex-1 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isCapturing ? 'Capturing...' : '📸 Capture'}
        </Button>
      </div>
    </div>
  );
}
