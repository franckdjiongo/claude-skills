import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import type { Theme } from '../hooks/useTheme';
import './ThemeToggle.css';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      className={`theme-toggle ${isDark ? 'is-dark' : 'is-light'}`}
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="theme-toggle-track">
        <motion.div
          className="theme-toggle-thumb"
          animate={{
            x: isDark ? 0 : 20,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        >
          <motion.div
            key={theme}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            {isDark ? (
              <Moon size={14} className="theme-icon moon" />
            ) : (
              <Sun size={14} className="theme-icon sun" />
            )}
          </motion.div>
        </motion.div>

        {/* Background icons */}
        <div className="theme-toggle-icons">
          <Sun size={10} className="bg-icon sun-bg" />
          <Moon size={10} className="bg-icon moon-bg" />
        </div>
      </div>
    </button>
  );
}
