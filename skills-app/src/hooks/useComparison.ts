import { useState, useCallback } from 'react';
import type { Skill } from '../types';

const MAX_COMPARISON = 3;

export function useComparison() {
  const [comparisonSkills, setComparisonSkills] = useState<Skill[]>([]);

  const addToComparison = useCallback((skill: Skill) => {
    setComparisonSkills((prev) => {
      // Don't add if already in comparison or at max
      if (prev.some((s) => s.id === skill.id)) return prev;
      if (prev.length >= MAX_COMPARISON) return prev;
      return [...prev, skill];
    });
  }, []);

  const removeFromComparison = useCallback((skillId: string) => {
    setComparisonSkills((prev) => prev.filter((s) => s.id !== skillId));
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonSkills([]);
  }, []);

  const isInComparison = useCallback((skillId: string) => {
    return comparisonSkills.some((s) => s.id === skillId);
  }, [comparisonSkills]);

  const toggleComparison = useCallback((skill: Skill) => {
    if (isInComparison(skill.id)) {
      removeFromComparison(skill.id);
    } else {
      addToComparison(skill);
    }
  }, [isInComparison, removeFromComparison, addToComparison]);

  const canAddMore = comparisonSkills.length < MAX_COMPARISON;
  const comparisonCount = comparisonSkills.length;
  const hasComparison = comparisonCount > 0;
  const canCompare = comparisonCount >= 2;

  return {
    comparisonSkills,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    toggleComparison,
    canAddMore,
    comparisonCount,
    hasComparison,
    canCompare,
    maxComparison: MAX_COMPARISON,
  };
}
