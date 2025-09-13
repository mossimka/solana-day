'use client';

import React from 'react';

const NetFallback: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`net-fallback ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 1,
        pointerEvents: 'none',
        background: `
          radial-gradient(circle at 20% 80%, rgba(255, 105, 180, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 105, 180, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 192, 203, 0.05) 0%, transparent 50%)
        `,
        backgroundSize: '200px 200px, 300px 300px, 400px 400px',
        animation: 'netMove 20s ease-in-out infinite'
      }}
    >
      <style jsx>{`
        @keyframes netMove {
          0%, 100% {
            background-position: 0% 50%, 100% 50%, 50% 50%;
          }
          50% {
            background-position: 100% 50%, 0% 50%, 50% 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default NetFallback;
