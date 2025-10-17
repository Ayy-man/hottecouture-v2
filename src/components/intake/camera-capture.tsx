'use client';

import { useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();

    if (imageSrc) {
      onCapture(imageSrc);
      setIsCapturing(false);
    }
  }, [onCapture]);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment', // Use back camera on mobile
  };

  return (
    <div className='space-y-4'>
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

      <div className='flex space-x-4'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          className='flex-1 py-3 text-lg btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300'
        >
          Cancel
        </Button>
        <Button
          type='button'
          onClick={capture}
          disabled={isCapturing}
          className='flex-1 py-3 text-lg btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isCapturing ? 'Capturing...' : 'Take Photo'}
        </Button>
      </div>
    </div>
  );
}
