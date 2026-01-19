import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Skill } from '../types';

export type SortOption = 'default' | 'name-asc' | 'name-desc' | 'category' | 'repository';

export interface SortConfig {
  id: SortOption;
  label: string;
  description: string;
}

export const sortOptions: SortConfig[] = [
  { id: 'default', label: 'Default', description: 'Original order' },
  { id: 'name-asc', label: 'A → Z', description: 'Alphabetical' },
  { id: 'name-desc', label: 'Z → A', description: 'Reverse alphabetical' },
  { id: 'category', label: 'Category', description: 'Group by category' },
  { id: 'repository', label: 'Repository', description: 'Group by source' },
];

const STORAGE_KEY = 'claude-skills-sort';

export function useSortSkills() {
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'default';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as SortOption) || 'default';
    } catch {
      return 'default';
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sortBy);
    } catch {
      // Ignore storage errors
    }
  }, [sortBy]);

  const sortSkills = useCallback((skills: Skill[]): Skill[] => {
    if (sortBy === 'default') return skills;

    const sorted = [...skills];

    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'category':
        sorted.sort((a, b) => {
          const catCompare = a.category.localeCompare(b.category);
          if (catCompare !== 0) return catCompare;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'repository':
        sorted.sort((a, b) => {
          const repoCompare = a.repository.localeCompare(b.repository);
          if (repoCompare !== 0) return repoCompare;
          return a.name.localeCompare(b.name);
        });
        break;
    }

    return sorted;
  }, [sortBy]);

  const currentSortLabel = useMemo(() => {
    return sortOptions.find((opt) => opt.id === sortBy)?.label || 'Default';
  }, [sortBy]);

  return {
    sortBy,
    setSortBy,
    sortSkills,
    sortOptions,
    currentSortLabel,
  };
}
