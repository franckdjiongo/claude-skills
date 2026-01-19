import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Folder, Tag, ChevronRight, Heart, GitCompare } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import { HighlightedText } from '../utils';
import './SkillCard.css';

interface SkillCardProps {
  skill: Skill;
  index: number;
  onClick: (skill: Skill) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (skillId: string) => void;
  isFocused?: boolean;
  searchQuery?: string;
  onHover?: (skill: Skill, event: React.MouseEvent) => void;
  onHoverEnd?: () => void;
  isInComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
}

export function SkillCard({
  skill,
  index,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  isFocused = false,
  searchQuery = '',
  onHover,
  onHoverEnd,
  isInComparison = false,
  onToggleComparison,
  canAddToComparison = true,
}: SkillCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(skill.id);
  };

  const handleComparisonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    onHover?.(skill, e);
  };

  const handleMouseLeave = () => {
    onHoverEnd?.();
  };

  const repoColor = getRepositoryColor(skill.repository);

  const getRepoLabel = () => {
    switch (skill.repository) {
      case 'superpowers':
        return 'SUPERPOWERS';
      case 'anthropic-skills':
        return 'ANTHROPIC';
      case 'antigravity-kit':
        return 'ANTIGRAVITY KIT';
      default:
        return 'LOCAL';
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={`skill-card ${isFocused ? 'keyboard-focused' : ''} ${isInComparison ? 'in-comparison' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(skill)}
      tabIndex={0}
      role="button"
      aria-label={`${skill.name}. ${skill.description}`}
      style={
        {
          '--mouse-x': `${mousePosition.x}px`,
          '--mouse-y': `${mousePosition.y}px`,
          '--repo-color': repoColor,
        } as React.CSSProperties
      }
    >
      <div className="card-glow" />
      <div className="card-border" />
      <div className="card-content">
        <div className="card-header">
          <div className="repo-badge" style={{ background: repoColor }}>
            {skill.isLocal ? <Folder size={10} /> : <ExternalLink size={10} />}
            <span>{getRepoLabel()}</span>
          </div>
          <div className="card-header-actions">
            {onToggleComparison && (
              <button
                className={`compare-button ${isInComparison ? 'is-comparing' : ''} ${!canAddToComparison && !isInComparison ? 'disabled' : ''}`}
                onClick={handleComparisonClick}
                disabled={!canAddToComparison && !isInComparison}
                aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
              >
                <GitCompare size={14} />
              </button>
            )}
            {onToggleFavorite && (
              <button
                className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`}
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
            <ChevronRight size={18} className="card-arrow" />
          </div>
        </div>

        <h3 className="card-title">
          <HighlightedText text={skill.name} query={searchQuery} />
        </h3>
        <p className="card-description">
          <HighlightedText text={skill.description} query={searchQuery} />
        </p>

        <div className="card-footer">
          <div className="card-tags">
            <Tag size={12} />
            {skill.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {skill.tags.length > 3 && (
              <span className="tag-more">+{skill.tags.length - 3}</span>
            )}
          </div>
        </div>
      </div>
      <div className="card-shine" />
    </motion.div>
  );
}
