import { motion, AnimatePresence } from 'motion/react';
import { X, Filter, Heart, Search, Folder, ExternalLink, Layers, Tag } from 'lucide-react';
import type { FilterType } from '../types';
import './ActiveFilters.css';

interface ActiveFiltersProps {
  searchQuery: string;
  activeCategory: string;
  categoryName: string;
  activeFilter: FilterType;
  showFavorites: boolean;
  favoritesCount: number;
  resultCount: number;
  selectedTags?: string[];
  onClearSearch: () => void;
  onClearCategory: () => void;
  onClearFilter: () => void;
  onClearFavorites: () => void;
  onClearTag?: (tag: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({
  searchQuery,
  activeCategory,
  categoryName,
  activeFilter,
  showFavorites,
  favoritesCount,
  resultCount,
  selectedTags = [],
  onClearSearch,
  onClearCategory,
  onClearFilter,
  onClearFavorites,
  onClearTag,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters =
    searchQuery ||
    activeCategory !== 'all' ||
    activeFilter !== 'all' ||
    showFavorites ||
    selectedTags.length > 0;

  if (!hasFilters) return null;

  const filterCount = [
    searchQuery ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    activeFilter !== 'all' ? 1 : 0,
    showFavorites ? 1 : 0,
    selectedTags.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="active-filters-container">
      <div className="active-filters-header">
        <div className="filters-label mono">
          <Filter size={12} />
          <span>{filterCount} active filter{filterCount > 1 ? 's' : ''}</span>
        </div>
        <div className="filters-result mono">
          <span className="result-count">{resultCount}</span>
          <span>result{resultCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="active-filters-pills">
        <AnimatePresence mode="popLayout">
          {searchQuery && (
            <motion.button
              key="search"
              className="filter-pill search"
              onClick={onClearSearch}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Search size={12} />
              <span className="pill-text">"{searchQuery}"</span>
              <X size={12} className="pill-close" />
            </motion.button>
          )}

          {activeCategory !== 'all' && (
            <motion.button
              key="category"
              className="filter-pill category"
              onClick={onClearCategory}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Layers size={12} />
              <span className="pill-text">{categoryName}</span>
              <X size={12} className="pill-close" />
            </motion.button>
          )}

          {activeFilter !== 'all' && (
            <motion.button
              key="filter"
              className={`filter-pill source ${activeFilter}`}
              onClick={onClearFilter}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {activeFilter === 'local' ? <Folder size={12} /> : <ExternalLink size={12} />}
              <span className="pill-text">
                {activeFilter === 'local' ? 'Local' : 'External'}
              </span>
              <X size={12} className="pill-close" />
            </motion.button>
          )}

          {showFavorites && (
            <motion.button
              key="favorites"
              className="filter-pill favorites"
              onClick={onClearFavorites}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Heart size={12} fill="currentColor" />
              <span className="pill-text">Favorites ({favoritesCount})</span>
              <X size={12} className="pill-close" />
            </motion.button>
          )}

          {selectedTags.map((tag) => (
            <motion.button
              key={`tag-${tag}`}
              className="filter-pill tag"
              onClick={() => onClearTag?.(tag)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Tag size={12} />
              <span className="pill-text">{tag}</span>
              <X size={12} className="pill-close" />
            </motion.button>
          ))}
        </AnimatePresence>

        {filterCount > 1 && (
          <motion.button
            className="clear-all-button mono"
            onClick={onClearAll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Clear all
          </motion.button>
        )}
      </div>
    </div>
  );
}
