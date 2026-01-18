import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  Zap,
  Bot,
  Database,
  FileText,
  Users,
  Code,
  Sparkles,
  Bug,
  GitBranch,
  BookOpen,
  Files,
  Palette,
  Terminal,
  Building,
} from 'lucide-react';
import type { Category } from '../types';
import './CategoryChips.css';

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Layers,
  Zap,
  Bot,
  Database,
  FileText,
  Users,
  Code,
  Sparkles,
  Bug,
  GitBranch,
  BookOpen,
  Files,
  Palette,
  Terminal,
  Building,
};

interface CategoryChipsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryChips({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeElement = activeRef.current;
      const containerWidth = container.offsetWidth;
      const activeLeft = activeElement.offsetLeft;
      const activeWidth = activeElement.offsetWidth;
      const scrollLeft = activeLeft - containerWidth / 2 + activeWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeCategory]);

  const getRepoClass = (repo: string) => {
    switch (repo) {
      case 'superpowers':
        return 'repo-superpowers';
      case 'anthropic-skills':
        return 'repo-anthropic';
      default:
        return 'repo-local';
    }
  };

  return (
    <div className="category-chips-wrapper">
      <div ref={scrollRef} className="category-chips hide-scrollbar">
        {categories.map((category) => {
          const Icon = iconMap[category.icon] || Layers;
          const isActive = activeCategory === category.id;

          return (
            <motion.button
              key={category.id}
              ref={isActive ? activeRef : null}
              className={`chip ${isActive ? 'active' : ''} ${getRepoClass(category.repository)}`}
              onClick={() => onCategoryChange(category.id)}
              whileTap={{ scale: 0.95 }}
            >
              <span className="chip-icon">
                <Icon size={16} />
              </span>
              <span className="chip-label">{category.name}</span>
              <span className="chip-count">{category.skillCount}</span>
              {isActive && (
                <motion.div
                  className="chip-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="chips-fade-left" />
      <div className="chips-fade-right" />
    </div>
  );
}
