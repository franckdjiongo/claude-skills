import { motion } from 'motion/react';
import { ExternalLink, Folder, ChevronRight, Heart, Tag, GitCompare } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import { HighlightedText } from '../utils';
import './SkillListItem.css';

interface SkillListItemProps {
  skill: Skill;
  index: number;
  onClick: (skill: Skill) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (skillId: string) => void;
  isFocused?: boolean;
  onTagClick?: (tag: string) => void;
  searchQuery?: string;
  isInComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
}

export function SkillListItem({
  skill,
  index,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  isFocused = false,
  onTagClick,
  searchQuery = '',
  isInComparison = false,
  onToggleComparison,
  canAddToComparison = true,
}: SkillListItemProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(skill.id);
  };

  const handleComparisonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.();
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    onTagClick?.(tag);
  };

  const repoColor = getRepositoryColor(skill.repository);

  const getRepoLabel = () => {
    switch (skill.repository) {
      case 'superpowers':
        return 'SUPERPOWERS';
      case 'anthropic-skills':
        return 'ANTHROPIC';
      case 'antigravity-kit':
        return 'ANTIGRAVITY';
      default:
        return 'LOCAL';
    }
  };

  return (
    <motion.div
      className={`skill-list-item ${isFocused ? 'keyboard-focused' : ''} ${isInComparison ? 'in-comparison' : ''}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.03,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(skill)}
      tabIndex={0}
      role="button"
      aria-label={`${skill.name}. ${skill.description}`}
      style={{ '--repo-color': repoColor } as React.CSSProperties}
    >
      <div className="list-item-indicator" />

      <div className="list-item-content">
        <div className="list-item-header">
          <h3 className="list-item-title">
            <HighlightedText text={skill.name} query={searchQuery} />
          </h3>
          <div className="list-item-meta">
            <span className="list-item-repo" style={{ color: repoColor }}>
              {skill.isLocal ? <Folder size={12} /> : <ExternalLink size={12} />}
              <span>{getRepoLabel()}</span>
            </span>
          </div>
        </div>

        <p className="list-item-description">
          <HighlightedText text={skill.description} query={searchQuery} />
        </p>

        <div className="list-item-tags">
          <Tag size={10} className="tag-icon" />
          {skill.tags.slice(0, 4).map((tag) => (
            <button
              key={tag}
              className="list-tag"
              onClick={(e) => handleTagClick(e, tag)}
            >
              {tag}
            </button>
          ))}
          {skill.tags.length > 4 && (
            <span className="list-tag-more">+{skill.tags.length - 4}</span>
          )}
        </div>
      </div>

      <div className="list-item-actions">
        {onToggleComparison && (
          <button
            className={`list-compare-button ${isInComparison ? 'is-comparing' : ''} ${!canAddToComparison && !isInComparison ? 'disabled' : ''}`}
            onClick={handleComparisonClick}
            disabled={!canAddToComparison && !isInComparison}
            aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
          >
            <GitCompare size={14} />
          </button>
        )}
        {onToggleFavorite && (
          <button
            className={`list-favorite-button ${isFavorite ? 'is-favorite' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={16}
              fill={isFavorite ? 'currentColor' : 'none'}
              strokeWidth={isFavorite ? 0 : 2}
            />
          </button>
        )}
        <ChevronRight size={18} className="list-arrow" />
      </div>
    </motion.div>
  );
}
