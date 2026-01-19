import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'claude-skills-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  const toggleFavorite = useCallback((skillId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (skillId: string) => favorites.has(skillId),
    [favorites]
  );

  const addFavorite = useCallback((skillId: string) => {
    setFavorites((prev) => new Set([...prev, skillId]));
  }, []);

  const removeFavorite = useCallback((skillId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(skillId);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
  }, []);

  return {
    favorites,
    favoritesCount: favorites.size,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  };
}
