// /components/common/OptimizedImage.tsx
'use client'

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string; // Appends to the image element
  wrapperClassName?: string; // Appends to the parent layout wrapper container
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallbackSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  width,
  height,
  fill = false,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  fallbackSrc = '/placeholder-event.jpg',
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FIX 3: Force the state to sync if the parent changes the URL source dynamically
  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setIsLoading(true);
  }, [src, fallbackSrc]);

  return (
    <div 
      className={`relative overflow-hidden ${wrapperClassName} ${
        isLoading ? 'bg-gray-200 dark:bg-gray-700 animate-pulse' : ''
      }`}
      style={!fill && !width ? { display: 'inline-block' } : undefined}
    >
      <Image
        src={imgSrc || fallbackSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        quality={quality}
        // ✅ FIX 2: Modern Next 16 styling approach using standard classes
        className={`transition-all duration-300 ${
          isLoading ? 'scale-105 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'
        } ${className}`}
        // ✅ FIX 1: Replaced deprecated onLoadingComplete with modern onLoad
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(fallbackSrc);
          setIsLoading(false);
        }}
        // 'loading' flag is redundant if priority is defined; Next automatically handles it.
      />
    </div>
  );
}
