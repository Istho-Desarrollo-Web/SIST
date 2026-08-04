import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="cx-btn cx-btn-ghost cx-btn-icon"
      title="Cambiar tema"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
