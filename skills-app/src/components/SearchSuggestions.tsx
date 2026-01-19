import { motion, AnimatePresence } from 'motion/react';
import { Clock, FileText, Tag, FolderOpen, X, Trash2 } from 'lucide-react';
import type { Suggestion } from '../hooks/useSearchHistory';
import './SearchSuggestions.css';

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  isVisible: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onRemoveHistory?: (value: string) => void;
  onClearHistory?: () => void;
  highlightedIndex?: number;
}

const iconMap = {
  history: Clock,
  skill: FileText,
  tag: Tag,
  category: FolderOpen,
};

const typeLabels = {
  history: 'Recent',
  skill: 'Skill',
  tag: 'Tag',
  category: 'Category',
};

export function SearchSuggestions({
  suggestions,
  isVisible,
  onSelect,
  onRemoveHistory,
  onClearHistory,
  highlightedIndex = -1,
}: SearchSuggestionsProps) {
  const hasHistory = suggestions.some((s) => s.type === 'history');

  return (
    <AnimatePresence>
      {isVisible && suggestions.length > 0 && (
        <motion.div
          className="search-suggestions"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="suggestions-glow" />
          <div className="suggestions-border" />

          <div className="suggestions-content">
            {hasHistory && onClearHistory && (
              <div className="suggestions-header">
                <span className="header-label">
                  <Clock size={12} />
                  Recent Searches
                </span>
                <button
                  className="clear-history-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearHistory();
                  }}
                  aria-label="Clear search history"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
            )}

            <ul className="suggestions-list" role="listbox">
              {suggestions.map((suggestion, index) => {
                const Icon = iconMap[suggestion.type];
                const isHighlighted = index === highlightedIndex;
                const isHistory = suggestion.type === 'history';

                return (
                  <motion.li
                    key={`${suggestion.type}-${suggestion.value}`}
                    className={`suggestion-item ${isHighlighted ? 'highlighted' : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelect(suggestion)}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <div className={`suggestion-icon type-${suggestion.type}`}>
                      <Icon size={14} />
                    </div>

                    <div className="suggestion-text">
                      <span className="suggestion-display">{suggestion.displayText}</span>
                      {suggestion.subText && (
                        <span className="suggestion-subtext">{suggestion.subText}</span>
                      )}
                    </div>

                    <span className={`suggestion-type type-${suggestion.type}`}>
                      {typeLabels[suggestion.type]}
                    </span>

                    {isHistory && onRemoveHistory && (
                      <button
                        className="remove-history-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistory(suggestion.value);
                        }}
                        aria-label={`Remove "${suggestion.displayText}" from history`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </ul>

            <div className="suggestions-footer">
              <kbd>↑</kbd><kbd>↓</kbd> to navigate
              <kbd>Enter</kbd> to select
              <kbd>Esc</kbd> to close
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
