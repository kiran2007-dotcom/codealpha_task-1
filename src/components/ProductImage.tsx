import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="w-full h-full bg-zinc-100 flex flex-col items-center justify-center p-6 text-zinc-400"
      >
        <Package className="w-8 h-8 stroke-[1.5] mb-2" />
        <span className="text-xs text-zinc-500 text-center line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
