export function LogoSIST({ size = 32, showText = true, textVariant = 'light', textClass = '' }) {
  const isLight = textVariant === 'light';
  return (
    <div className="flex items-center gap-2.5">
      <div
        style={{ width: size, height: size }}
        className="bg-orange-500 rounded-xl flex items-center justify-center shrink-0 p-1.5"
      >
        <img src="/logo-blanco.png" alt="ISTHO" className="w-full h-full object-contain" />
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
