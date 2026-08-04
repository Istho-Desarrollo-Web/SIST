import { slaColor } from '../../utils/formatters';

export function SLAIndicator({ porcentaje }) {
  const pct = Number(porcentaje);
  if (porcentaje == null || isNaN(pct)) {
    return <span className="text-muted" style={{ fontSize: 11 }}>Sin calcular</span>;
  }

  const barWidth = Math.min(pct, 100);
  const color = slaColor(pct);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
      <div style={{ flex: 1, background: 'var(--color-border)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${barWidth}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}
