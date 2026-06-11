// Gitcito mascot — a friendly, curious axolotl that guides users through
// repository history. Used in welcome, empty, loading and error states.

export function Axolotl({ size = 96 }: { size?: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Gitcito axolotl mascot"
    >
      {/* External gills — playful brand-colored fronds */}
      <g stroke="#ff8fb1" strokeWidth="5" strokeLinecap="round">
        <path d="M38 38 C24 30 18 34 14 28" />
        <path d="M36 48 C20 46 14 52 8 50" />
        <path d="M38 58 C22 62 18 70 12 72" />
        <path d="M82 38 C96 30 102 34 106 28" />
        <path d="M84 48 C100 46 106 52 112 50" />
        <path d="M82 58 C98 62 102 70 108 72" />
      </g>
      <g fill="#ffb3c9">
        <circle cx="13" cy="27" r="5" />
        <circle cx="7" cy="49" r="5" />
        <circle cx="11" cy="73" r="5" />
        <circle cx="107" cy="27" r="5" />
        <circle cx="113" cy="49" r="5" />
        <circle cx="109" cy="73" r="5" />
      </g>

      {/* Body */}
      <ellipse cx="60" cy="78" rx="30" ry="26" fill="#ff9fc0" />
      {/* Head */}
      <circle cx="60" cy="50" r="34" fill="#ffb0cd" />

      {/* Cheeks */}
      <circle cx="42" cy="58" r="6" fill="#ff7aa6" opacity="0.55" />
      <circle cx="78" cy="58" r="6" fill="#ff7aa6" opacity="0.55" />

      {/* Eyes */}
      <circle cx="48" cy="48" r="5.5" fill="#2b2d42" />
      <circle cx="72" cy="48" r="5.5" fill="#2b2d42" />
      <circle cx="49.6" cy="46.2" r="1.8" fill="#ffffff" />
      <circle cx="73.6" cy="46.2" r="1.8" fill="#ffffff" />

      {/* Smile */}
      <path
        d="M52 60 Q60 67 68 60"
        stroke="#2b2d42"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
