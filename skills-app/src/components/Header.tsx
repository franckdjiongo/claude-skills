import { useState, useEffect, type RefObject, type ReactNode } from 'react';
import { Search, X, Sparkles, Menu, Heart, HelpCircle, BarChart3, GitCompare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewModeToggle } from './ViewModeToggle';
import { SortDropdown } from './SortDropdown';
import { ThemeToggle } from './ThemeToggle';
import type { ViewMode } from '../hooks/useViewMode';
import type { SortOption } from '../hooks/useSortSkills';
import type { Theme } from '../hooks/useTheme';
import './Header.css';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  onSearchSubmit?: () => void;
  totalSkills: number;
  onMenuClick: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  favoritesCount?: number;
  viewMode?: ViewMode;
  onViewModeToggle?: () => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  theme?: Theme;
  onThemeToggle?: () => void;
  onHelpClick?: () => void;
  onStatsClick?: () => void;
  comparisonCount?: number;
  onCompareClick?: () => void;
  searchSuggestions?: ReactNode;
}

export function Header({
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchSubmit,
  totalSkills,
  onMenuClick,
  searchInputRef,
  favoritesCount = 0,
  viewMode = 'grid',
  onViewModeToggle,
  sortBy = 'default',
  onSortChange,
  theme = 'dark',
  onThemeToggle,
  onHelpClick,
  onStatsClick,
  comparisonCount = 0,
  onCompareClick,
  searchSuggestions,
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

  const handleFocus = () => {
    setIsSearchFocused(true);
    onSearchFocus?.();
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
    onSearchBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.();
    }
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
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

            {/* Search Suggestions */}
            {searchSuggestions}
          </div>

          <div className="header-controls">
            {onStatsClick && (
              <button
                className="header-icon-button"
                onClick={onStatsClick}
                aria-label="View statistics"
                title="Statistics (S)"
              >
                <BarChart3 size={18} />
              </button>
            )}
            {onCompareClick && comparisonCount >= 2 && (
              <button
                className="header-icon-button compare-button"
                onClick={onCompareClick}
                aria-label={`Compare ${comparisonCount} skills`}
                title={`Compare ${comparisonCount} skills (C)`}
              >
                <GitCompare size={18} />
                <span className="compare-badge">{comparisonCount}</span>
              </button>
            )}
            {onSortChange && (
              <SortDropdown value={sortBy} onChange={onSortChange} />
            )}
            {onViewModeToggle && (
              <ViewModeToggle viewMode={viewMode} onToggle={onViewModeToggle} />
            )}
            {onThemeToggle && (
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            )}
            {onHelpClick && (
              <button
                className="header-icon-button"
                onClick={onHelpClick}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <HelpCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
