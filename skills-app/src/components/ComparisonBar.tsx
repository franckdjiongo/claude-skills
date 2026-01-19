import { motion, AnimatePresence } from 'motion/react';
import { GitCompare, X, Eye, Trash2 } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import './ComparisonBar.css';

interface ComparisonBarProps {
  skills: Skill[];
  onRemove: (skillId: string) => void;
  onClear: () => void;
  onCompare: () => void;
  maxComparison: number;
}

export function ComparisonBar({
  skills,
  onRemove,
  onClear,
  onCompare,
  maxComparison,
}: ComparisonBarProps) {
  const canCompare = skills.length >= 2;

  return (
    <AnimatePresence>
      {skills.length > 0 && (
        <motion.div
          className="comparison-bar"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="comparison-bar-glow" />
          <div className="comparison-bar-border" />

          <div className="comparison-bar-content">
            <div className="comparison-bar-header">
              <div className="comparison-bar-title">
                <GitCompare size={16} />
                <span>Compare Skills</span>
              </div>
              <div className="comparison-bar-count">
                {skills.length}/{maxComparison} selected
              </div>
            </div>

            <div className="comparison-skills">
              {skills.map((skill) => (
                <motion.div
                  key={skill.id}
                  className="comparison-skill-chip"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{ '--repo-color': getRepositoryColor(skill.repository) } as React.CSSProperties}
                >
                  <span className="comparison-skill-name">{skill.name}</span>
                  <button
                    className="comparison-skill-remove"
                    onClick={() => onRemove(skill.id)}
                    aria-label={`Remove ${skill.name} from comparison`}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="comparison-bar-actions">
              <button
                className="comparison-action secondary"
                onClick={onClear}
                aria-label="Clear comparison"
              >
                <Trash2 size={14} />
                Clear
              </button>
              <button
                className={`comparison-action primary ${!canCompare ? 'disabled' : ''}`}
                onClick={onCompare}
                disabled={!canCompare}
              >
                <Eye size={14} />
                Compare {skills.length} Skills
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
