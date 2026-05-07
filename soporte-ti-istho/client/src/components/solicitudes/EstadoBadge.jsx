import { Badge } from '../common/Badge';
import { ESTADOS_LABEL, ESTADO_COLORS } from '../../utils/constants';

export function EstadoBadge({ estado }) {
  return (
    <Badge className={ESTADO_COLORS[estado] || ''}>
      {ESTADOS_LABEL[estado] || estado}
    </Badge>
  );
}
