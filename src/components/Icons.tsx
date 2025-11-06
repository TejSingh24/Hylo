import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Custom RateX icon - X in a circle matching the pasted image style
export const RateXIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle background */}
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* X shape */}
      <path
        d="M8 8L16 16M16 8L8 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Asset boost icon (lightning bolt)
export const AssetBoostIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
};
