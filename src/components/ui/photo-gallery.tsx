'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  photos: Array<{
    id: string;
    url: string;
    alt: string;
    caption?: string;
  }>;
  className?: string;
}

export function PhotoGallery({ photos, className = '' }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return null;
  }

  if (photos.length === 1 && photos[0]) {
    return (
      <div className={`${className}`}>
        <img
          src={photos[0].url}
          alt={photos[0].alt}
          className='w-full h-48 object-cover rounded-lg border border-border'
          onError={e => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {photos[0].caption && (
          <p className='text-sm text-muted-foreground mt-2 text-center'>
            {photos[0].caption}
          </p>
        )}
      </div>
    );
  }

  const nextPhoto = () => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  return (
    <div className={`${className}`}>
      <div className='relative'>
        <img
          src={currentPhoto.url}
          alt={currentPhoto.alt}
          className='w-full h-48 object-cover rounded-lg border border-border'
          onError={e => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {photos.length > 1 && (
          <>
            <Button
              variant='outline'
              size='sm'
              className='absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white'
              onClick={prevPhoto}
            >
              ‹
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white'
              onClick={nextPhoto}
            >
              ›
            </Button>
          </>
        )}
      </div>

      {currentPhoto.caption && (
        <p className='text-sm text-muted-foreground mt-2 text-center'>
          {currentPhoto.caption}
        </p>
      )}

      {photos.length > 1 && (
        <div className='flex justify-center mt-2 space-x-1'>
          {photos.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? 'bg-blue-500' : 'bg-muted'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
