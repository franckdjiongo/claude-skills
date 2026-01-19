import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronUp,
  Shuffle,
  FilterX,
  Sparkles,
  X,
} from 'lucide-react';
import './FloatingActionButton.css';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  showScrollTop: boolean;
  onScrollTop: () => void;
  onRandomSkill: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FloatingActionButton({
  showScrollTop,
  onScrollTop,
  onRandomSkill,
  onClearFilters,
  hasActiveFilters,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'random',
      icon: <Shuffle size={18} />,
      label: 'Random skill',
      onClick: () => {
        onRandomSkill();
        setIsExpanded(false);
      },
      color: 'var(--accent-gold)',
    },
    ...(hasActiveFilters
      ? [
          {
            id: 'clear',
            icon: <FilterX size={18} />,
            label: 'Clear filters',
            onClick: () => {
              onClearFilters();
              setIsExpanded(false);
            },
            color: 'var(--accent-magenta)',
          },
        ]
      : []),
  ];

  const handleMainClick = () => {
    if (showScrollTop && !isExpanded) {
      onScrollTop();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="fab-container">
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              className="fab-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
            />
            <div className="fab-actions">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  className="fab-action"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  onClick={action.onClick}
                  style={{ '--action-color': action.color } as React.CSSProperties}
                >
                  <span className="fab-action-icon">{action.icon}</span>
                  <span className="fab-action-label">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        className={`fab-main ${isExpanded ? 'expanded' : ''} ${showScrollTop && !isExpanded ? 'scroll-top' : ''}`}
        onClick={handleMainClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="fab-glow" />
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={24} />
            </motion.span>
          ) : showScrollTop ? (
            <motion.span
              key="scroll"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronUp size={24} />
            </motion.span>
          ) : (
            <motion.span
              key="sparkle"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
