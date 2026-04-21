import { useRef, useState } from 'react';

const LENS_SIZE = 180;
const ZOOM = 2.5;

export default function ZoomableImage({ src, alt = '', className = '' }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [lens, setLens] = useState(null); // { x, y, bgX, bgY, bgW, bgH }

  const update = (e) => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }

    const bgW = img.clientWidth * ZOOM;
    const bgH = img.clientHeight * ZOOM;
    const imgOffsetX = img.offsetLeft;
    const imgOffsetY = img.offsetTop;
    // Mouse position within the image
    const ix = x - imgOffsetX;
    const iy = y - imgOffsetY;

    const bgX = ix * ZOOM - LENS_SIZE / 2;
    const bgY = iy * ZOOM - LENS_SIZE / 2;

    setLens({ x, y, bgX, bgY, bgW, bgH });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={update}
      onMouseLeave={() => setLens(null)}
      className={`relative overflow-hidden ${className}`}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full object-contain max-h-[85vh] block"
      />
      {lens && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-white shadow-xl"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: lens.x - LENS_SIZE / 2,
            top: lens.y - LENS_SIZE / 2,
            backgroundImage: `url(${src})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${lens.bgW}px ${lens.bgH}px`,
            backgroundPosition: `-${lens.bgX}px -${lens.bgY}px`,
            backgroundColor: '#fff',
          }}
        />
      )}
    </div>
  );
}
