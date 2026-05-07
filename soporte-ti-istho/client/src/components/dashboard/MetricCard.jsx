import { Card } from '../common/Card';

export function MetricCard({ title, value, subtitle, icon: Icon, color = 'orange', trend }) {
  const colors = {
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    navy: 'bg-navy-100 text-navy-600 dark:bg-navy-800 dark:text-navy-300',
    green: 'bg-cgreen-100 text-cgreen-600 dark:bg-cgreen-900/30 dark:text-cgreen-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-navy-500 dark:text-white mt-1">{value ?? '-'}</p>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </Card>
  );
}
