import { slaColor, slaTextColor } from '../../utils/formatters';

export function SLAIndicator({ porcentaje }) {
  if (porcentaje === null || porcentaje === undefined) {
    return <span className="text-xs text-slate-400">Sin calcular</span>;
  }

  const barWidth = Math.min(porcentaje, 100);
  const color = slaColor(porcentaje);
  const textColor = slaTextColor(porcentaje);

  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 bg-slate-200 dark:bg-navy-600 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{porcentaje.toFixed(0)}%</span>
    </div>
  );
}
