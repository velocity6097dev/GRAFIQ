import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import CircleLoader from './CircleLoader'

// Drop-in replacement for <img> — shows the circle loader exactly where
// the image will be while it's still fetching (e.g. Unsplash images on
// a slow connection), then cross-fades to the real image once it's in.
// If the image fails outright (bad URL, network blip, deleted asset),
// shows a small muted icon instead of silently leaving a blank box —
// broken images should still be visibly broken, not invisible.
//
// `className` sizes/positions the OUTER box (aspect ratio, border, w-full,
// etc — whatever used to be on the <img> itself). `imgClassName` styles
// the <img> inside it (object-cover/object-contain etc), defaulting to
// filling the box with object-cover.
export default function LoadingImage({
  src,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  loaderSize = 40,
  ...imgProps
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CircleLoader size={loaderSize} />
        </div>
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff size={Math.max(loaderSize * 0.5, 16)} className="text-slate" />
        </div>
      )}
      {!errored && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`${imgClassName} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...imgProps}
        />
      )}
    </div>
  )
}
