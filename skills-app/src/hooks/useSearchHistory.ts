import { useState, useCallback, useMemo } from 'react';
import { skills, categories } from '../data/skills';

const STORAGE_KEY = 'skills-search-history';
const MAX_HISTORY = 10;

interface Suggestion {
  type: 'history' | 'skill' | 'tag' | 'category';
  value: string;
  displayText: string;
  subText?: string;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistory = useCallback((newHistory: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const trimmed = query.trim().toLowerCase();
    setHistory((prev) => {
      // Remove duplicate if exists and add to front
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed);
      const newHistory = [query.trim(), ...filtered].slice(0, MAX_HISTORY);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item !== query);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // Get all unique tags from skills
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    skills.forEach((skill) => skill.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  const getSuggestions = useCallback((query: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // Show recent history when empty
      return history.slice(0, 5).map((item) => ({
        type: 'history',
        value: item,
        displayText: item,
      }));
    }

    // Add matching history items first
    const matchingHistory = history.filter((item) =>
      item.toLowerCase().includes(normalizedQuery)
    );
    matchingHistory.slice(0, 3).forEach((item) => {
      suggestions.push({
        type: 'history',
        value: item,
        displayText: item,
      });
    });

    // Add matching skill names
    const matchingSkills = skills.filter((skill) =>
      skill.name.toLowerCase().includes(normalizedQuery)
    );
    matchingSkills.slice(0, 4).forEach((skill) => {
      suggestions.push({
        type: 'skill',
        value: skill.name,
        displayText: skill.name,
        subText: skill.categoryName,
      });
    });

    // Add matching tags
    const matchingTags = allTags.filter((tag) =>
      tag.toLowerCase().includes(normalizedQuery)
    );
    matchingTags.slice(0, 3).forEach((tag) => {
      suggestions.push({
        type: 'tag',
        value: `tag:${tag}`,
        displayText: tag,
        subText: 'Tag',
      });
    });

    // Add matching categories
    const matchingCategories = categories.filter(
      (cat) =>
        cat.id !== 'all' && cat.name.toLowerCase().includes(normalizedQuery)
    );
    matchingCategories.slice(0, 2).forEach((cat) => {
      suggestions.push({
        type: 'category',
        value: `category:${cat.id}`,
        displayText: cat.name,
        subText: `${cat.skillCount} skills`,
      });
    });

    return suggestions.slice(0, 8);
  }, [history, allTags]);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
    getSuggestions,
  };
}

export type { Suggestion };
