import { Badge } from '../common/Badge';
import { PRIORIDADES_LABEL, PRIORIDAD_COLORS } from '../../utils/constants';

export function PrioridadBadge({ prioridad }) {
  return (
    <Badge className={PRIORIDAD_COLORS[prioridad] || ''}>
      {PRIORIDADES_LABEL[prioridad] || prioridad}
    </Badge>
  );
}
