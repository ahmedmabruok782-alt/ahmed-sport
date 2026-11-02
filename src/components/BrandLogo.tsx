interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 38, className = '' }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ahmedSportShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="55%" stopColor="#155eef" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* Championship Shield Base */}
      <path
        d="M32 4 55 12.5v17.2c0 14.4-9.8 25.8-23 30.3C18.8 55.5 9 44.1 9 29.7V12.5L32 4Z"
        fill="url(#ahmedSportShield)"
      />
      {/* Subtle Inner Shield Rim */}
      <path
        d="M32 8.2 51 15.2v14.3c0 12-8 21.7-19 25.8-11-4.1-19-13.8-19-25.8V15.2L32 8.2Z"
        fill="none"
        stroke="rgba(255,255,255,0.24)"
        strokeWidth="1.6"
      />
      {/* Stylized Dynamic 'A' + Stadium Pitch Star Mark */}
      <path
        d="M32 16 43.5 43h-5.4l-2.3-5.8h-7.6L25.9 43h-5.4L32 16Zm0 10.6-2.4 6.1h4.8L32 26.6Z"
        fill="#ffffff"
      />
      <circle cx="32" cy="47.5" r="2.6" fill="#34d399" />
    </svg>
  );
}
