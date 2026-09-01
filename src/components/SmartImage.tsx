import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  onClick?: () => void;
  priority?: boolean;
}

// Global cache for loaded image URLs to avoid repeated shimmer on re-renders
const loadedImagesCache = new Set<string>();

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  aspectRatio,
  fallbackIcon,
  fallbackText,
  onClick,
  priority = false,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return Boolean(src && loadedImagesCache.has(src));
  });
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) {
      setIsLoaded(false);
      setHasError(true);
      return;
    }
    if (loadedImagesCache.has(src)) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setIsLoaded(false);
      setHasError(false);
      // Preload image
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedImagesCache.add(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setHasError(true);
      };
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-stone-100 border border-stone-200/80 flex flex-col items-center justify-center text-stone-400 select-none ${containerClassName}`}
        style={aspectRatio ? { aspectRatio } : undefined}
        onClick={onClick}
      >
        {fallbackIcon || <ImageIcon className="w-6 h-6 stroke-[1.5] text-stone-400" />}
        {fallbackText && (
          <span className="text-[11px] font-medium text-stone-500 mt-1 px-2 text-center truncate max-w-full">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-stone-200/60 ${containerClassName} ${onClick ? 'cursor-pointer' : ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      onClick={onClick}
    >
      {/* Progressive loading shimmer skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-pulse" />
      )}

      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onLoad={() => {
          if (src) loadedImagesCache.add(src);
          setIsLoaded(true);
        }}
        onError={() => {
          setHasError(true);
        }}
        className={`w-full h-full object-cover transition-all duration-500 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'
        } ${className}`}
      />
    </div>
  );
};

export default SmartImage;
