import { motion } from 'motion/react';
import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../hooks/useViewMode';
import './ViewModeToggle.css';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onToggle: () => void;
}

export function ViewModeToggle({ viewMode, onToggle }: ViewModeToggleProps) {
  return (
    <button
      className="view-mode-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
    >
      <div className="view-mode-track">
        <motion.div
          className="view-mode-indicator"
          animate={{ x: viewMode === 'list' ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
        <div className={`view-mode-option ${viewMode === 'grid' ? 'active' : ''}`}>
          <LayoutGrid size={14} />
        </div>
        <div className={`view-mode-option ${viewMode === 'list' ? 'active' : ''}`}>
          <List size={14} />
        </div>
      </div>
    </button>
  );
}
