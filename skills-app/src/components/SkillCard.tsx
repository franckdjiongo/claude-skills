import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Folder, Tag, ChevronRight } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor } from '../data/skills';
import './SkillCard.css';

interface SkillCardProps {
  skill: Skill;
  index: number;
  onClick: (skill: Skill) => void;
}

export function SkillCard({ skill, index, onClick }: SkillCardProps) {
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
      className="skill-card"
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
      onClick={() => onClick(skill)}
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
          <ChevronRight size={18} className="card-arrow" />
        </div>

        <h3 className="card-title">{skill.name}</h3>
        <p className="card-description">{skill.description}</p>

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
