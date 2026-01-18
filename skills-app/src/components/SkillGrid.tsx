import { motion, AnimatePresence } from 'motion/react';
import { SearchX, Sparkles } from 'lucide-react';
import type { Skill } from '../types';
import { SkillCard } from './SkillCard';
import './SkillGrid.css';

interface SkillGridProps {
  skills: Skill[];
  searchQuery: string;
  onSkillClick: (skill: Skill) => void;
}

export function SkillGrid({ skills, searchQuery, onSkillClick }: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="empty-icon">
          {searchQuery ? <SearchX size={48} /> : <Sparkles size={48} />}
        </div>
        <h3 className="empty-title">
          {searchQuery ? 'No skills found' : 'No skills in this category'}
        </h3>
        <p className="empty-description">
          {searchQuery
            ? `No results for "${searchQuery}". Try a different search term.`
            : 'Select a different category to explore skills.'}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="skill-grid-container">
      <motion.div
        className="skill-grid"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {skills.map((skill, index) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              index={index}
              onClick={onSkillClick}
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
    </div>
  );
}
