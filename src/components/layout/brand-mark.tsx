export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="brand-g"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1e4b8f" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#brand-g)" />
      <path
        d="M13 27.5 32 12l19 15.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="38.5" r="13.5" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <path
        d="M32 28v2.6M42.5 38.5h-2.6M32 49v-2.6M21.5 38.5h2.6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M32 38.5V31M32 38.5l5.4 3.2"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="32" cy="38.5" r="1.7" fill="#ffffff" />
    </svg>
  );
}
