export function LogoIcon({ size = 24, color = 'white' }) {
  const isDark = color === 'dark';
  const fill = isDark ? '#E8531E' : 'white';
  const perfColor = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.22)';
  const dotFill = isDark ? '#4C8C2B' : 'rgba(255,255,255,0.9)';
  const checkColor = isDark ? 'white' : '#E8531E';

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="lim">
          <rect width="40" height="40" fill="white"/>
          <circle cx="0" cy="20" r="4.5" fill="black"/>
          <circle cx="40" cy="20" r="4.5" fill="black"/>
        </mask>
      </defs>
      <rect y="11" width="40" height="18" rx="2.5" fill={fill} mask="url(#lim)"/>
      <line x1="20" y1="12.5" x2="20" y2="27.5"
            stroke={perfColor} strokeWidth="1.4" strokeDasharray="2.2 1.8"/>
      <circle cx="31.5" cy="25" r="3" fill={dotFill}/>
      <path d="M30.2 25 L31.2 26.2 L33.1 23.8"
            stroke={checkColor} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export function LogoSIST({ size = 32, showText = true, textVariant = 'light', textClass = '' }) {
  const isLight = textVariant === 'light';
  return (
    <div className="flex items-center gap-2.5">
      <div
        style={{ width: size, height: size }}
        className="bg-orange-500 rounded-xl flex items-center justify-center shrink-0"
      >
        <LogoIcon size={Math.round(size * 0.6)} />
      </div>
      {showText && (
        <div className={textClass}>
          <p className={`font-bold text-sm leading-none ${isLight ? 'text-white' : 'text-navy-500 dark:text-white'}`}>
            Soporte TI
          </p>
          <p className={`text-xs leading-none mt-0.5 ${isLight ? 'text-navy-200' : 'text-slate-400'}`}>
            ISTHO S.A.S.
          </p>
        </div>
      )}
    </div>
  );
}
