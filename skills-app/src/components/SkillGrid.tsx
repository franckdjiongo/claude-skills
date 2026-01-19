import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchX, Sparkles, Heart } from 'lucide-react';
import type { Skill } from '../types';
import type { ViewMode } from '../hooks/useViewMode';
import { SkillCard } from './SkillCard';
import { SkillListItem } from './SkillListItem';
import './SkillGrid.css';

interface SkillGridProps {
  skills: Skill[];
  searchQuery: string;
  onSkillClick: (skill: Skill) => void;
  isFavorite?: (skillId: string) => boolean;
  onToggleFavorite?: (skillId: string) => void;
  focusedIndex?: number;
  showFavorites?: boolean;
  viewMode?: ViewMode;
  onTagClick?: (tag: string) => void;
}

export const SkillGrid = forwardRef<HTMLDivElement, SkillGridProps>(
  function SkillGrid(
    {
      skills,
      searchQuery,
      onSkillClick,
      isFavorite,
      onToggleFavorite,
      focusedIndex = -1,
      showFavorites = false,
      viewMode = 'grid',
      onTagClick,
    },
    ref
  ) {
    if (skills.length === 0) {
      return (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="empty-icon">
            {showFavorites ? (
              <Heart size={48} />
            ) : searchQuery ? (
              <SearchX size={48} />
            ) : (
              <Sparkles size={48} />
            )}
          </div>
          <h3 className="empty-title">
            {showFavorites
              ? 'No favorites yet'
              : searchQuery
              ? 'No skills found'
              : 'No skills in this category'}
          </h3>
          <p className="empty-description">
            {showFavorites
              ? 'Click the heart icon on any skill to add it to your favorites.'
              : searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : 'Select a different category to explore skills.'}
          </p>
        </motion.div>
      );
    }

    const isListView = viewMode === 'list';

    return (
      <div className="skill-grid-container">
        <motion.div
          ref={ref}
          className={isListView ? 'skill-list' : 'skill-grid'}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: isListView ? 0.03 : 0.05 },
            },
          }}
        >
          <AnimatePresence mode="popLayout">
            {isListView
              ? skills.map((skill, index) => (
                  <SkillListItem
                    key={skill.id}
                    skill={skill}
                    index={index}
                    onClick={onSkillClick}
                    isFavorite={isFavorite?.(skill.id)}
                    onToggleFavorite={onToggleFavorite}
                    isFocused={focusedIndex === index}
                    onTagClick={onTagClick}
                  />
                ))
              : skills.map((skill, index) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    index={index}
                    onClick={onSkillClick}
                    isFavorite={isFavorite?.(skill.id)}
                    onToggleFavorite={onToggleFavorite}
                    isFocused={focusedIndex === index}
                  />
                ))}
          </AnimatePresence>
        </motion.div>

        <div className="grid-stats mono">
          <span className="stats-count">{skills.length}</span>
          <span className="stats-label">
            {skills.length === 1 ? 'skill' : 'skills'}
          </span>
        </div>

        {/* Screen reader announcement region */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </div>
    );
  }
);
