import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'claude-skills-recent-views';
const MAX_RECENT = 10;

export interface RecentView {
  skillId: string;
  timestamp: number;
}

export function useRecentViews() {
  const [recentViews, setRecentViews] = useState<RecentView[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever recent views change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentViews));
    } catch {
      // Ignore storage errors
    }
  }, [recentViews]);

  const addRecentView = useCallback((skillId: string) => {
    setRecentViews((prev) => {
      // Remove existing entry for this skill if present
      const filtered = prev.filter((view) => view.skillId !== skillId);

      // Add new entry at the beginning
      const updated = [
        { skillId, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);

      return updated;
    });
  }, []);

  const removeRecentView = useCallback((skillId: string) => {
    setRecentViews((prev) => prev.filter((view) => view.skillId !== skillId));
  }, []);

  const clearRecentViews = useCallback(() => {
    setRecentViews([]);
  }, []);

  const getRecentSkillIds = useCallback(() => {
    return recentViews.map((view) => view.skillId);
  }, [recentViews]);

  const formatTimestamp = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  return {
    recentViews,
    recentCount: recentViews.length,
    addRecentView,
    removeRecentView,
    clearRecentViews,
    getRecentSkillIds,
    formatTimestamp,
  };
}
