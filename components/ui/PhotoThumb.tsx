'use client';

import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  /** Absolute-fill mode: renders position:absolute inset-0, for aspect-ratio containers */
  fill?: boolean;
}

export default function PhotoThumb({ src, alt, fill }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          ...(fill
            ? { position: 'absolute', inset: 0, zIndex: 2 }
            : { width: '100%', height: '100%' }),
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: '#bbb',
          userSelect: 'none',
        }}
      >
        ?
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={
        fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
          : { width: '100%', height: '100%', objectFit: 'cover' }
      }
    />
  );
}
