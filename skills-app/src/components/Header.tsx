import { useState, useEffect, useRef, type RefObject, type ReactNode } from 'react';
import { Search, X, Sparkles, Menu, Heart, HelpCircle, BarChart3, GitCompare, MoreVertical, Grid3X3, List, SortAsc, Moon, Sun } from 'lucide-react';
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const quickActionsRef = useRef<HTMLDivElement>(null);
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

  // Close quick actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setIsQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    onSearchChange('');
    searchInputRef?.current?.focus();
  };

  const handleFocus = () => {
    setIsSearchFocused(true);
    setIsSearchExpanded(true);
    onSearchFocus?.();
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
    onSearchBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.();
    }
    if (e.key === 'Escape') {
      setIsSearchExpanded(false);
      searchInputRef?.current?.blur();
    }
  };

  const handleQuickAction = (action: () => void) => {
    action();
    setIsQuickActionsOpen(false);
  };

  return (
    <header className={`header safe-area-top ${isSearchExpanded ? 'search-expanded' : ''}`}>
      <div className="header-content">
        {/* Mobile: Single unified row */}
        <div className="header-row">
          {/* Menu button */}
          <button className="menu-button" onClick={onMenuClick} aria-label="Menu">
            <Menu size={20} />
            {favoritesCount > 0 && (
              <span className="menu-badge">
                <Heart size={8} fill="currentColor" />
              </span>
            )}
          </button>

          {/* Logo - collapses on mobile when search is expanded */}
          <AnimatePresence mode="wait">
            {!isSearchExpanded && (
              <motion.div
                className="logo-section"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="logo-icon">
                  <Sparkles size={18} />
                </div>
                <div className="logo-text">
                  <h1 className="title mono">{displayText}<span className="cursor">_</span></h1>
                  <p className="subtitle"><span className="accent">{totalSkills}</span> skills</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search container - expands on mobile */}
          <motion.div
            className={`search-container ${isSearchFocused ? 'focused' : ''}`}
            layout
            transition={{ duration: 0.2 }}
          >
            <div className="search-icon">
              <Search size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input mono"
              placeholder="Search..."
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
            {searchSuggestions}
          </motion.div>

          {/* Desktop controls */}
          <div className="header-controls desktop-only">
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

          {/* Mobile quick actions */}
          <div className="quick-actions-wrapper mobile-only" ref={quickActionsRef}>
            <button
              className={`quick-actions-trigger ${isQuickActionsOpen ? 'active' : ''}`}
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              aria-label="Quick actions"
              aria-expanded={isQuickActionsOpen}
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {isQuickActionsOpen && (
                <motion.div
                  className="quick-actions-menu"
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {onViewModeToggle && (
                    <button
                      className="quick-action-item"
                      onClick={() => handleQuickAction(onViewModeToggle)}
                    >
                      {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
                      <span>{viewMode === 'grid' ? 'List view' : 'Grid view'}</span>
                    </button>
                  )}
                  {onSortChange && (
                    <button
                      className="quick-action-item"
                      onClick={() => handleQuickAction(() => onSortChange(sortBy === 'name-asc' ? 'default' : 'name-asc'))}
                    >
                      <SortAsc size={18} />
                      <span>Sort by {sortBy === 'name-asc' ? 'Default' : 'Name'}</span>
                    </button>
                  )}
                  {onThemeToggle && (
                    <button
                      className="quick-action-item"
                      onClick={() => handleQuickAction(onThemeToggle)}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                  )}
                  {onStatsClick && (
                    <button
                      className="quick-action-item"
                      onClick={() => handleQuickAction(onStatsClick)}
                    >
                      <BarChart3 size={18} />
                      <span>Statistics</span>
                    </button>
                  )}
                  {onHelpClick && (
                    <button
                      className="quick-action-item"
                      onClick={() => handleQuickAction(onHelpClick)}
                    >
                      <HelpCircle size={18} />
                      <span>Help</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
