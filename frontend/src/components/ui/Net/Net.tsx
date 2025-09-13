'use client';

import { useEffect, useRef, useState } from 'react';
import NetFallback from './NetFallback';

declare global {
  interface Window {
    THREE: unknown;
    VANTA: {
      GLOBE: (options: Record<string, unknown>) => {
        destroy: () => void;
      };
      NET: (options: Record<string, unknown>) => {
        destroy: () => void;
      };
    };
  }
}

interface NetProps {
  className?: string;
}

const Net: React.FC<NetProps> = ({ className = '' }) => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const initVanta = () => {
      if (vantaRef.current && window.VANTA && window.THREE) {
        console.log('Initializing Vanta NET effect');
        try {
          vantaEffect.current = window.VANTA.NET({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0xff69b4, // Pink primary color from your variables
            backgroundColor: 0x0, // Transparent background
            points: 10.00,
            maxDistance: 20.00,
            spacing: 15.00,
            backgroundAlpha: 0.0
          });
          console.log('Vanta NET effect initialized successfully');
        } catch (error) {
          console.error('Error initializing Vanta NET:', error);
          setFallback(true);
        }
      } else {
        console.log('Vanta dependencies not ready:', { 
          element: !!vantaRef.current, 
          VANTA: !!window.VANTA, 
          THREE: !!window.THREE 
        });
        // Set fallback after a timeout if scripts don't load
        setTimeout(() => setFallback(true), 3000);
      }
    };

    // Function to load scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          console.log('Script already loaded:', src);
          resolve();
          return;
        }

        console.log('Loading script:', src);
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          console.log('Script loaded successfully:', src);
          resolve();
        };
        script.onerror = (error) => {
          console.error('Failed to load script:', src, error);
          reject(error);
        };
        document.head.appendChild(script);
      });
    };

    // Load Three.js and Vanta.js
    const loadVanta = async () => {
      try {
        console.log('Starting to load Vanta scripts...');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js');
        
        console.log('All scripts loaded, initializing Vanta...');
        // Wait a bit for scripts to be fully available
        setTimeout(initVanta, 500);
      } catch (error) {
        console.error('Failed to load Vanta.js scripts:', error);
        setFallback(true);
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

  // Show fallback if Vanta fails to load
  if (fallback) {
    return <NetFallback className={className} />;
  }

  return (
    <div 
      ref={vantaRef} 
      className={`vanta-net ${className}`}
      style={{
        width: '100%',
        height: '100vh',
        minHeight: '400px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default Net;
