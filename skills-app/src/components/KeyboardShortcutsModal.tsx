import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Search, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';
import './KeyboardShortcutsModal.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

const shortcuts: { category: string; items: ShortcutItem[] }[] = [
  {
    category: 'Navigation',
    items: [
      { keys: ['↑', '↓'], description: 'Navigate through skills', icon: <><ArrowUp size={12} /><ArrowDown size={12} /></> },
      { keys: ['←', '→'], description: 'Move between columns (grid view)', icon: <><ArrowLeft size={12} /><ArrowRight size={12} /></> },
      { keys: ['Enter'], description: 'Open selected skill', icon: <CornerDownLeft size={12} /> },
      { keys: ['Esc'], description: 'Close modal / Clear selection' },
    ],
  },
  {
    category: 'Search & Filter',
    items: [
      { keys: ['/'], description: 'Focus search input', icon: <Search size={12} /> },
      { keys: ['?'], description: 'Open this help modal', icon: <Keyboard size={12} /> },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: ['F'], description: 'Toggle favorite (when skill selected)' },
      { keys: ['G'], description: 'Switch between grid and list view' },
      { keys: ['R'], description: 'Open random skill' },
      { keys: ['C'], description: 'Clear all filters' },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="shortcuts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="shortcuts-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
          >
            <div className="shortcuts-modal glass">
              <div className="shortcuts-header">
                <div className="shortcuts-title">
                  <Keyboard size={20} className="shortcuts-icon" />
                  <h2>Keyboard Shortcuts</h2>
                </div>
                <button
                  className="shortcuts-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="shortcuts-content hide-scrollbar">
                {shortcuts.map((section, sectionIndex) => (
                  <motion.div
                    key={section.category}
                    className="shortcuts-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sectionIndex * 0.1 }}
                  >
                    <h3 className="shortcuts-category mono">{section.category}</h3>
                    <div className="shortcuts-list">
                      {section.items.map((item, itemIndex) => (
                        <motion.div
                          key={itemIndex}
                          className="shortcut-item"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.05 }}
                        >
                          <div className="shortcut-keys">
                            {item.keys.map((key, keyIndex) => (
                              <span key={keyIndex}>
                                <kbd className="shortcut-key mono">{key}</kbd>
                                {keyIndex < item.keys.length - 1 && (
                                  <span className="key-separator">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                          <span className="shortcut-description">{item.description}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="shortcuts-footer">
                <p className="shortcuts-hint mono">
                  Press <kbd>?</kbd> anytime to show this help
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
