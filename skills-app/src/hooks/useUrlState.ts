import { useEffect, useCallback } from 'react';
import type { FilterType } from '../types';

export interface UrlState {
  searchQuery: string;
  activeCategory: string;
  activeFilter: FilterType;
  selectedSkillId: string | null;
  showFavorites: boolean;
}

const DEFAULT_STATE: UrlState = {
  searchQuery: '',
  activeCategory: 'all',
  activeFilter: 'all',
  selectedSkillId: null,
  showFavorites: false,
};

export function parseUrlState(): UrlState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  const params = new URLSearchParams(window.location.search);

  return {
    searchQuery: params.get('q') || '',
    activeCategory: params.get('category') || 'all',
    activeFilter: (params.get('filter') as FilterType) || 'all',
    selectedSkillId: params.get('skill') || null,
    showFavorites: params.get('favorites') === 'true',
  };
}

export function useUrlState(
  state: Partial<UrlState>,
  onInitialLoad?: (state: UrlState) => void
) {
  // Parse URL on mount
  useEffect(() => {
    const urlState = parseUrlState();
    if (onInitialLoad) {
      onInitialLoad(urlState);
    }
  }, []);

  // Update URL when state changes
  const updateUrl = useCallback((newState: Partial<UrlState>) => {
    const params = new URLSearchParams();

    const merged = { ...DEFAULT_STATE, ...state, ...newState };

    if (merged.searchQuery) {
      params.set('q', merged.searchQuery);
    }
    if (merged.activeCategory && merged.activeCategory !== 'all') {
      params.set('category', merged.activeCategory);
    }
    if (merged.activeFilter && merged.activeFilter !== 'all') {
      params.set('filter', merged.activeFilter);
    }
    if (merged.selectedSkillId) {
      params.set('skill', merged.selectedSkillId);
    }
    if (merged.showFavorites) {
      params.set('favorites', 'true');
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [state]);

  return { updateUrl, parseUrlState };
}
