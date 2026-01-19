import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { sortOptions, type SortOption } from '../hooks/useSortSkills';
import './SortDropdown.css';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const currentOption = sortOptions.find((opt) => opt.id === value);

  const handleSelect = (optionId: SortOption) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className="sort-dropdown" ref={dropdownRef}>
      <button
        className={`sort-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <ArrowUpDown size={14} className="sort-icon" />
        <span className="sort-label">{currentOption?.label || 'Sort'}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sort-dropdown-menu"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
          >
            <div className="sort-menu-glow" />
            {sortOptions.map((option) => (
              <button
                key={option.id}
                className={`sort-option ${value === option.id ? 'selected' : ''}`}
                onClick={() => handleSelect(option.id)}
                role="option"
                aria-selected={value === option.id}
              >
                <div className="sort-option-content">
                  <span className="sort-option-label">{option.label}</span>
                  <span className="sort-option-desc">{option.description}</span>
                </div>
                {value === option.id && (
                  <Check size={14} className="sort-check" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
