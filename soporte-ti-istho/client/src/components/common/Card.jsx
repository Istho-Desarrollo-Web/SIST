export function Card({ children, className = '' }) {
  return (
    <div className={`cx-card cx-elev-sm ${className}`}>
      {children}
    </div>
  );
}
