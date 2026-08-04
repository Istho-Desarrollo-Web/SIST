export function Skeleton({ className = '', style }) {
  return <div className={`cx-skeleton ${className}`} style={{ height: 14, ...style }} />;
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} style={{ height: 12, flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Skeleton style={{ height: 14, width: 96 }} />
            <Skeleton style={{ height: 18, width: 64, borderRadius: 999 }} />
          </div>
          <Skeleton style={{ height: 14, width: '75%' }} />
          <Skeleton style={{ height: 12, width: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
            <Skeleton style={{ height: 18, width: 80, borderRadius: 999 }} />
            <Skeleton style={{ height: 14, width: 64 }} />
            <Skeleton style={{ height: 12, width: 96 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
