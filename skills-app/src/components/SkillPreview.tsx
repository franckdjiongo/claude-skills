import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Folder, Tag, Heart, GitCompare, Eye, Copy, Check } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import './SkillPreview.css';

interface SkillPreviewProps {
  skill: Skill | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpenDetail: (skill: Skill) => void;
  onToggleFavorite?: (skillId: string) => void;
  onToggleComparison?: (skill: Skill) => void;
  isFavorite?: boolean;
  isInComparison?: boolean;
  canAddToComparison?: boolean;
}

export function SkillPreview({
  skill,
  position,
  onClose,
  onOpenDetail,
  onToggleFavorite,
  onToggleComparison,
  isFavorite = false,
  isInComparison = false,
  canAddToComparison = true,
}: SkillPreviewProps) {
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!position || !previewRef.current) {
      setAdjustedPosition(position);
      return;
    }

    const rect = previewRef.current.getBoundingClientRect();
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width + padding > viewportWidth) {
      x = position.x - rect.width - 20; // Show on left side
    }

    // Adjust vertical position
    if (y + rect.height + padding > viewportHeight) {
      y = viewportHeight - rect.height - padding;
    }
    if (y < padding) {
      y = padding;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  const handleCopyPath = async () => {
    if (!skill) return;
    try {
      await navigator.clipboard.writeText(skill.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  if (!skill) return null;

  const repoColor = getRepositoryColor(skill.repository);

  const getRepoLabel = () => {
    switch (skill.repository) {
      case 'superpowers':
        return 'Superpowers';
      case 'anthropic-skills':
        return 'Anthropic';
      case 'antigravity-kit':
        return 'Antigravity Kit';
      default:
        return 'Local';
    }
  };

  return (
    <AnimatePresence>
      {skill && position && (
        <motion.div
          ref={previewRef}
          className="skill-preview"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          style={{
            left: adjustedPosition?.x ?? position.x,
            top: adjustedPosition?.y ?? position.y,
            '--repo-color': repoColor,
          } as React.CSSProperties}
          onMouseLeave={onClose}
        >
          <div className="preview-glow" />
          <div className="preview-border" />

          <div className="preview-content">
            {/* Header */}
            <div className="preview-header">
              <div className="preview-repo-badge" style={{ background: repoColor }}>
                {skill.isLocal ? <Folder size={10} /> : <ExternalLink size={10} />}
                <span>{getRepoLabel()}</span>
              </div>
              <span className="preview-category">{skill.categoryName}</span>
            </div>

            {/* Title and Description */}
            <h4 className="preview-title">{skill.name}</h4>
            <p className="preview-description">{skill.description}</p>

            {/* Tags */}
            <div className="preview-tags">
              <Tag size={12} />
              {skill.tags.map((tag) => (
                <span key={tag} className="preview-tag">
                  {tag}
                </span>
              ))}
            </div>

            {/* Path */}
            <div className="preview-path">
              <code>{skill.path}</code>
              <button
                className="copy-path-btn"
                onClick={handleCopyPath}
                aria-label="Copy path"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            {/* Actions */}
            <div className="preview-actions">
              <button
                className="preview-action primary"
                onClick={() => onOpenDetail(skill)}
              >
                <Eye size={14} />
                View Details
              </button>

              {onToggleFavorite && (
                <button
                  className={`preview-action ${isFavorite ? 'active' : ''}`}
                  onClick={() => onToggleFavorite(skill.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}

              {onToggleComparison && (
                <button
                  className={`preview-action ${isInComparison ? 'active' : ''} ${!canAddToComparison && !isInComparison ? 'disabled' : ''}`}
                  onClick={() => onToggleComparison(skill)}
                  disabled={!canAddToComparison && !isInComparison}
                  aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
                >
                  <GitCompare size={14} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
