import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, X, ChevronDown, ChevronUp } from 'lucide-react';
import './TagFilter.css';

interface TagFilterProps {
  popularTags: string[];
  allTags: string[];
  tagCounts: Map<string, number>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export function TagFilter({
  popularTags,
  allTags,
  tagCounts,
  selectedTags,
  onToggleTag,
  onClearTags,
}: TagFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTags = isExpanded ? allTags : popularTags;

  return (
    <div className="tag-filter">
      <div className="tag-filter-header">
        <div className="tag-filter-title">
          <Tag size={14} />
          <span>Filter by Tags</span>
        </div>
        {selectedTags.length > 0 && (
          <button className="tag-clear-btn" onClick={onClearTags}>
            <X size={12} />
            <span>Clear ({selectedTags.length})</span>
          </button>
        )}
      </div>

      <div className="tag-cloud">
        <AnimatePresence mode="popLayout">
          {displayTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            const count = tagCounts.get(tag) || 0;

            return (
              <motion.button
                key={tag}
                className={`tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleTag(tag)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                layout
              >
                <span className="tag-name">{tag}</span>
                <span className="tag-count">{count}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {allTags.length > popularTags.length && (
        <button
          className="tag-expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>Show all {allTags.length} tags</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
