import { useState, useCallback, useEffect, useRef } from 'react';
import type { Skill } from '../types';

interface UseKeyboardNavigationProps {
  skills: Skill[];
  onSkillSelect: (skill: Skill) => void;
  onSearchFocus: () => void;
  columnsCount?: number;
}

export function useKeyboardNavigation({
  skills,
  onSkillSelect,
  onSearchFocus,
  columnsCount = 3,
}: UseKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Reset focus when skills change
  useEffect(() => {
    setFocusedIndex(-1);
    setIsNavigating(false);
  }, [skills]);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't interfere with input fields
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Slash to focus search (unless already in input)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        onSearchFocus();
        return;
      }

      // Escape to clear focus or close
      if (e.key === 'Escape') {
        if (isInput) {
          (target as HTMLInputElement).blur();
        }
        setFocusedIndex(-1);
        setIsNavigating(false);
        return;
      }

      // Only handle arrow keys when not in input
      if (isInput) return;

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key) && e.key !== 'Enter') return;

      e.preventDefault();

      // Start navigation if not already navigating
      if (!isNavigating && arrowKeys.includes(e.key)) {
        setIsNavigating(true);
        setFocusedIndex(0);
        if (skills[0]) {
          announce(`Navigating skills. ${skills[0].name}`);
        }
        return;
      }

      // Handle Enter to select
      if (e.key === 'Enter' && focusedIndex >= 0 && skills[focusedIndex]) {
        onSkillSelect(skills[focusedIndex]);
        announce(`Selected ${skills[focusedIndex].name}`);
        return;
      }

      // Calculate new index based on arrow key
      let newIndex = focusedIndex;
      const currentRow = Math.floor(focusedIndex / columnsCount);
      const totalRows = Math.ceil(skills.length / columnsCount);

      switch (e.key) {
        case 'ArrowUp':
          if (currentRow > 0) {
            newIndex = focusedIndex - columnsCount;
          }
          break;
        case 'ArrowDown':
          if (currentRow < totalRows - 1) {
            const nextIndex = focusedIndex + columnsCount;
            if (nextIndex < skills.length) {
              newIndex = nextIndex;
            }
          }
          break;
        case 'ArrowLeft':
          if (focusedIndex > 0) {
            newIndex = focusedIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (focusedIndex < skills.length - 1) {
            newIndex = focusedIndex + 1;
          }
          break;
      }

      if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < skills.length) {
        setFocusedIndex(newIndex);
        announce(`${skills[newIndex].name}. ${newIndex + 1} of ${skills.length}`);

        // Scroll the focused card into view
        const card = gridRef.current?.children[newIndex] as HTMLElement;
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    [skills, focusedIndex, isNavigating, columnsCount, onSkillSelect, onSearchFocus, announce]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex,
    isNavigating,
    gridRef,
    announcementRef,
    setFocusedIndex,
    resetNavigation: () => {
      setFocusedIndex(-1);
      setIsNavigating(false);
    },
  };
}
