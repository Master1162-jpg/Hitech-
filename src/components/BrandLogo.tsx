import React, { useId } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const wingGradId = `htWing-${uid}`;
  const silverGradId = `htSilver-${uid}`;
  const brandGradId = `htBrand-${uid}`;
  const glowId = `htGlow-${uid}`;
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-11' : 'h-8';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 select-none ${className}`}
      aria-label="HitechTrade"
    >
      <svg
        viewBox="0 0 244 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightClass} w-auto shrink-0`}
        role="img"
        aria-label="HitechTrade Logo"
      >
        <defs>
          <linearGradient id={wingGradId} x1="4" y1="6" x2="54" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="45%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#00D4AA" />
          </linearGradient>
          <linearGradient id={silverGradId} x1="56" y1="12" x2="56" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id={brandGradId} x1="142" y1="12" x2="236" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00D4AA" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <filter id={glowId} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#0EA5E9" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Kaizenfin-inspired sweeping crescent wing & cyber-slanted H monogram */}
        <g filter={`url(#${glowId})`}>
          <path
            d="M4 37.5C13 44.5 34 45.5 52 38.5C37 42 18 41 11 35.5L17.5 13H10.5L4 37.5Z"
            fill={`url(#${wingGradId})`}
          />
          <path d="M14.5 11H22.5L17.2 35H9.2L14.5 11Z" fill={`url(#${wingGradId})`} />
          <path d="M17.5 21.5L36.5 18.5L34.8 25.5L15.8 27.5L17.5 21.5Z" fill="#00D4AA" />
          <path d="M35.5 9L45.5 6.5L37.8 35H29.8L35.5 9Z" fill={`url(#${wingGradId})`} />
          <path
            d="M42.5 1.5L44.1 6.1L48.7 7.7L44.1 9.3L42.5 13.9L40.9 9.3L36.3 7.7L40.9 6.1L42.5 1.5Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Italicized Kaizenfin-style metallic wordmark: HITECHTRADE */}
        <g transform="skewX(-12)">
          <text
            x="56"
            y="34"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="800"
            fontSize="22"
            letterSpacing="0.5"
            fill={`url(#${silverGradId})`}
          >
            HITECH
          </text>
          <text
            x="144"
            y="34"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="800"
            fontSize="22"
            letterSpacing="0.5"
            fill={`url(#${brandGradId})`}
          >
            TRADE
          </text>
        </g>

        {/* Speed streak underline */}
        <path
          d="M52 39.5H232L226 41.8H48L52 39.5Z"
          fill={`url(#${wingGradId})`}
          fillOpacity="0.65"
        />
      </svg>
    </span>
  );
};
