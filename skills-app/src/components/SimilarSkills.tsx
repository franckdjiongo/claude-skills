import { motion } from 'motion/react';
import { Sparkles, ChevronRight, ExternalLink, Folder } from 'lucide-react';
import type { Skill } from '../types';
import { getRepositoryColor, getSimilarSkills } from '../data/skills';
import './SimilarSkills.css';

interface SimilarSkillsProps {
  skill: Skill;
  onSkillClick: (skill: Skill) => void;
}

export function SimilarSkills({ skill, onSkillClick }: SimilarSkillsProps) {
  const similarSkills = getSimilarSkills(skill, 4);

  if (similarSkills.length === 0) {
    return null;
  }

  return (
    <div className="similar-skills">
      <h4 className="similar-skills-title mono">
        <Sparkles size={14} />
        Similar Skills
      </h4>
      <div className="similar-skills-list">
        {similarSkills.map((similarSkill, index) => (
          <motion.button
            key={similarSkill.id}
            className="similar-skill-item"
            onClick={() => onSkillClick(similarSkill)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            style={
              {
                '--repo-color': getRepositoryColor(similarSkill.repository),
              } as React.CSSProperties
            }
          >
            <div className="similar-skill-indicator" />
            <div className="similar-skill-content">
              <span className="similar-skill-name">{similarSkill.name}</span>
              <span className="similar-skill-repo">
                {similarSkill.isLocal ? (
                  <Folder size={10} />
                ) : (
                  <ExternalLink size={10} />
                )}
                {similarSkill.repository === 'claude-skills'
                  ? 'LOCAL'
                  : similarSkill.repository === 'superpowers'
                  ? 'SUPERPOWERS'
                  : similarSkill.repository === 'anthropic-skills'
                  ? 'ANTHROPIC'
                  : 'ANTIGRAVITY'}
              </span>
            </div>
            <ChevronRight size={14} className="similar-skill-arrow" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
