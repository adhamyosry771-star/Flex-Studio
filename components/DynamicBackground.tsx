
import React from 'react';

interface DynamicBackgroundProps {
  url?: string;
  overlayOpacity?: number;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ url, overlayOpacity = 0.6 }) => {
  if (!url) return null;

  const isVideo = url.toLowerCase().endsWith('.mp4') || 
                  url.toLowerCase().endsWith('.webm') || 
                  url.toLowerCase().endsWith('.ogg');

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {isVideo ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute min-w-full min-h-full object-cover"
        >
          <source src={url} type={`video/${url.split('.').pop()}`} />
        </video>
      ) : (
        <img 
          src={url} 
          alt="" 
          className="absolute min-w-full min-h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      
      {/* Black Header/Overlay for Luxury Look */}
      <div 
        className="absolute inset-0 bg-slate-950" 
        style={{ opacity: overlayOpacity }}
      ></div>
      
      {/* Subtle Gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40"></div>
    </div>
  );
};
