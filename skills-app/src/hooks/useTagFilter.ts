import { useState, useCallback, useMemo } from 'react';
import type { Skill } from '../types';
import { skills } from '../data/skills';

export function useTagFilter() {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Extract all unique tags from skills
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    skills.forEach((skill) => {
      skill.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Get tag counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    skills.forEach((skill) => {
      skill.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return counts;
  }, []);

  // Get popular tags (top 15 by count)
  const popularTags = useMemo(() => {
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);
  }, [tagCounts]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const selectTag = useCallback((tag: string) => {
    setSelectedTags((prev) => new Set([...prev, tag]));
  }, []);

  const deselectTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  const isTagSelected = useCallback(
    (tag: string) => selectedTags.has(tag),
    [selectedTags]
  );

  const filterByTags = useCallback(
    (skillsToFilter: Skill[]): Skill[] => {
      if (selectedTags.size === 0) return skillsToFilter;
      return skillsToFilter.filter((skill) =>
        Array.from(selectedTags).every((tag) => skill.tags.includes(tag))
      );
    },
    [selectedTags]
  );

  const hasSelectedTags = selectedTags.size > 0;

  return {
    allTags,
    popularTags,
    tagCounts,
    selectedTags,
    selectedTagsArray: Array.from(selectedTags),
    hasSelectedTags,
    toggleTag,
    selectTag,
    deselectTag,
    clearTags,
    isTagSelected,
    filterByTags,
  };
}
