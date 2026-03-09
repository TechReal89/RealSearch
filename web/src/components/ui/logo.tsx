/**
 * RealSearch Logo - Kính lúp tìm kiếm vàng gold với vương miện
 */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8860b" />
          <stop offset="30%" stopColor="#d4a84b" />
          <stop offset="50%" stopColor="#f0d78c" />
          <stop offset="70%" stopColor="#d4a84b" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="goldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a84b" />
          <stop offset="50%" stopColor="#fff5d4" />
          <stop offset="100%" stopColor="#d4a84b" />
        </linearGradient>
        <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
      </defs>

      {/* Vương miện (Crown) - phía trên kính lúp */}
      <g transform="translate(12, 2)">
        {/* Crown base */}
        <path
          d="M4 16 L8 6 L14 12 L20 4 L26 12 L32 6 L36 16 Z"
          fill="url(#goldGrad)"
          stroke="#b8860b"
          strokeWidth="0.5"
        />
        {/* Crown band */}
        <rect x="4" y="14" width="32" height="4" rx="1" fill="url(#goldGrad)" />
        {/* Crown jewels */}
        <circle cx="14" cy="11" r="1.5" fill="#fff5d4" opacity="0.9" />
        <circle cx="20" cy="7" r="1.8" fill="#fff5d4" opacity="0.9" />
        <circle cx="26" cy="11" r="1.5" fill="#fff5d4" opacity="0.9" />
      </g>

      {/* Kính lúp (Magnifying glass) */}
      {/* Glass circle */}
      <circle
        cx="28"
        cy="34"
        r="14"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="4"
      />
      {/* Glass inner highlight */}
      <circle
        cx="28"
        cy="34"
        r="10"
        fill="rgba(212,168,75,0.06)"
      />
      {/* Glass shine */}
      <path
        d="M20 28 Q23 24 28 26"
        stroke="url(#goldGradLight)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Handle */}
      <line
        x1="38"
        y1="44"
        x2="52"
        y2="58"
        stroke="url(#goldGrad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Handle highlight */}
      <line
        x1="39"
        y1="43"
        x2="51"
        y2="55"
        stroke="url(#goldGradLight)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * Logo nhỏ gọn cho favicon/icon - chỉ kính lúp
 */
export function LogoMini({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="goldMini" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8860b" />
          <stop offset="50%" stopColor="#f0d78c" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="6" fill="none" stroke="url(#goldMini)" strokeWidth="2.5" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="url(#goldMini)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Mini crown on top */}
      <path d="M5.5 4.5 L7 2 L8.5 3.5 L10 1 L11.5 3.5 L13 2 L14.5 4.5 Z" fill="url(#goldMini)" />
    </svg>
  );
}
