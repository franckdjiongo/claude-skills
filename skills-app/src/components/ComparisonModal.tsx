import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GitCompare,
  ExternalLink,
  Folder,
  Tag,
  FolderOpen,
  Check,
  Minus,
} from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import './ComparisonModal.css';

interface ComparisonModalProps {
  isOpen: boolean;
  skills: Skill[];
  onClose: () => void;
}

export function ComparisonModal({ isOpen, skills, onClose }: ComparisonModalProps) {
  // Find common and unique tags
  const tagAnalysis = useMemo(() => {
    if (skills.length < 2) return { common: [], unique: new Map() };

    const tagSets = skills.map((s) => new Set(s.tags));
    const allTags = new Set(skills.flatMap((s) => s.tags));

    const common: string[] = [];
    const unique = new Map<string, string[]>(); // skillId -> unique tags

    allTags.forEach((tag) => {
      const presentIn = skills.filter((s) => s.tags.includes(tag));
      if (presentIn.length === skills.length) {
        common.push(tag);
      }
    });

    skills.forEach((skill) => {
      const uniqueTags = skill.tags.filter(
        (tag) => !common.includes(tag) && skills.filter((s) => s.tags.includes(tag)).length === 1
      );
      unique.set(skill.id, uniqueTags);
    });

    return { common, unique };
  }, [skills]);

  const getRepoLabel = (repository: Skill['repository']) => {
    switch (repository) {
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
      {isOpen && skills.length >= 2 && (
        <>
          <motion.div
            className="comparison-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="comparison-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="comparison-glow" />
            <div className="comparison-border" />

            <div className="comparison-header">
              <div className="comparison-title-section">
                <GitCompare size={24} className="comparison-icon" />
                <div>
                  <h2 className="comparison-title">Skill Comparison</h2>
                  <p className="comparison-subtitle">
                    Comparing {skills.length} skills side by side
                  </p>
                </div>
              </div>
              <button className="comparison-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="comparison-content">
              {/* Skills Grid */}
              <div
                className="comparison-grid"
                style={{ '--column-count': skills.length } as React.CSSProperties}
              >
                {skills.map((skill, index) => {
                  const repoColor = getRepositoryColor(skill.repository);
                  const uniqueTags = tagAnalysis.unique.get(skill.id) || [];

                  return (
                    <motion.div
                      key={skill.id}
                      className="comparison-column"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{ '--repo-color': repoColor } as React.CSSProperties}
                    >
                      {/* Column Header */}
                      <div className="column-header">
                        <div className="column-repo-badge" style={{ background: repoColor }}>
                          {skill.isLocal ? <Folder size={10} /> : <ExternalLink size={10} />}
                          <span>{getRepoLabel(skill.repository)}</span>
                        </div>
                      </div>

                      {/* Name */}
                      <div className="column-section">
                        <h3 className="column-skill-name">{skill.name}</h3>
                      </div>

                      {/* Description */}
                      <div className="column-section">
                        <label className="column-label">Description</label>
                        <p className="column-description">{skill.description}</p>
                      </div>

                      {/* Category */}
                      <div className="column-section">
                        <label className="column-label">Category</label>
                        <div className="column-category">
                          <FolderOpen size={14} />
                          {skill.categoryName}
                        </div>
                      </div>

                      {/* Common Tags */}
                      {tagAnalysis.common.length > 0 && (
                        <div className="column-section">
                          <label className="column-label">
                            <Check size={12} className="label-icon common" />
                            Common Tags
                          </label>
                          <div className="column-tags">
                            {tagAnalysis.common.map((tag) => (
                              <span
                                key={tag}
                                className={`column-tag ${skill.tags.includes(tag) ? 'has' : 'missing'}`}
                              >
                                {skill.tags.includes(tag) ? (
                                  <Check size={10} />
                                ) : (
                                  <Minus size={10} />
                                )}
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unique Tags */}
                      <div className="column-section">
                        <label className="column-label">
                          <Tag size={12} className="label-icon unique" />
                          Unique Tags
                        </label>
                        <div className="column-tags">
                          {uniqueTags.length > 0 ? (
                            uniqueTags.map((tag) => (
                              <span key={tag} className="column-tag unique">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="column-tag-none">No unique tags</span>
                          )}
                        </div>
                      </div>

                      {/* All Tags */}
                      <div className="column-section">
                        <label className="column-label">All Tags ({skill.tags.length})</label>
                        <div className="column-tags scrollable">
                          {skill.tags.map((tag) => (
                            <span key={tag} className="column-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Path */}
                      <div className="column-section">
                        <label className="column-label">Path</label>
                        <code className="column-path">{skill.path}</code>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Common Tags Summary */}
              {tagAnalysis.common.length > 0 && (
                <div className="comparison-summary">
                  <h4 className="summary-title">
                    <Check size={16} />
                    {tagAnalysis.common.length} Common Tags
                  </h4>
                  <div className="summary-tags">
                    {tagAnalysis.common.map((tag) => (
                      <span key={tag} className="summary-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
