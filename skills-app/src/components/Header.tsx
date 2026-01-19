import { useState, useEffect, type RefObject } from 'react';
import { Search, X, Sparkles, Menu, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewModeToggle } from './ViewModeToggle';
import { SortDropdown } from './SortDropdown';
import type { ViewMode } from '../hooks/useViewMode';
import type { SortOption } from '../hooks/useSortSkills';
import './Header.css';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalSkills: number;
  onMenuClick: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  favoritesCount?: number;
  viewMode?: ViewMode;
  onViewModeToggle?: () => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalSkills,
  onMenuClick,
  searchInputRef,
  favoritesCount = 0,
  viewMode = 'grid',
  onViewModeToggle,
  sortBy = 'default',
  onSortChange,
}: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const fullTitle = 'CLAUDE SKILLS';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullTitle.length) {
        setDisplayText(fullTitle.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const handleClear = () => {
    onSearchChange('');
    searchInputRef?.current?.focus();
  };

  return (
    <header className="header safe-area-top">
      <div className="header-content">
        <div className="header-top">
          <button className="menu-button" onClick={onMenuClick} aria-label="Menu">
            <Menu size={22} />
            {favoritesCount > 0 && (
              <span className="menu-badge">
                <Heart size={8} fill="currentColor" />
              </span>
            )}
          </button>

          <div className="logo-section">
            <div className="logo-icon">
              <Sparkles size={20} />
            </div>
            <div className="logo-text">
              <h1 className="title mono">
                {displayText}
                <span className="cursor">_</span>
              </h1>
              <p className="subtitle">
                <span className="accent">{totalSkills}</span> skills loaded
              </p>
            </div>
          </div>

          <div className="header-spacer" />
        </div>

        <div className="search-row">
          <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
            <div className="search-icon">
              <Search size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input mono"
              placeholder="Search skills... (press /)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="clear-button"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </motion.button>
              )}
            </AnimatePresence>
            <div className="search-glow" />
          </div>

          <div className="header-controls">
            {onSortChange && (
              <SortDropdown value={sortBy} onChange={onSortChange} />
            )}
            {onViewModeToggle && (
              <ViewModeToggle viewMode={viewMode} onToggle={onViewModeToggle} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
