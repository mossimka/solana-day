'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    THREE: unknown;
    VANTA: {
      GLOBE: (options: Record<string, unknown>) => {
        destroy: () => void;
      };
    };
  }
}

interface GlobeProps {
  className?: string;
}

const Globe: React.FC<GlobeProps> = ({ className = '' }) => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const initVanta = () => {
      if (vantaRef.current && window.VANTA && window.THREE) {
        vantaEffect.current = window.VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: 0x0f0a0d, // Using our dark background color
          color: 0xc71585, // Pink primary color
          color2: 0xffc0cb, // Light pink accent
          size: 1.0,
          backgroundAlpha: 0.0
        });
      }
    };

    // Function to load scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Load Three.js and Vanta.js
    const loadVanta = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js');
        
        // Wait a bit for scripts to be fully available
        setTimeout(initVanta, 100);
      } catch (error) {
        console.error('Failed to load Vanta.js scripts:', error);
      }
    };

    loadVanta();

    // Cleanup function
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  return (
    <div 
      ref={vantaRef} 
      className={`vanta-globe ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px'
      }}
    />
  );
};

export default Globe;
