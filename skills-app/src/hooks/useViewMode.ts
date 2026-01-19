import { useState, useCallback, useEffect } from 'react';

export type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'claude-skills-view-mode';

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'list' || stored === 'grid') ? stored : 'grid';
    } catch {
      return 'grid';
    }
  });

  // Persist to localStorage whenever view mode changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage errors
    }
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
  }, []);

  const setGrid = useCallback(() => {
    setViewMode('grid');
  }, []);

  const setList = useCallback(() => {
    setViewMode('list');
  }, []);

  return {
    viewMode,
    isGrid: viewMode === 'grid',
    isList: viewMode === 'list',
    toggleViewMode,
    setGrid,
    setList,
    setViewMode,
  };
}
