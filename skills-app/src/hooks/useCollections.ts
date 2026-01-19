import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'skills-collections';

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  skillIds: string[];
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_COLORS = [
  '#00f0ff', // cyan
  '#ff00d4', // magenta
  '#ffd700', // gold
  '#00ff88', // green
  '#ff6b6b', // red
  '#a855f7', // purple
  '#f97316', // orange
];

const DEFAULT_ICONS = [
  'folder',
  'star',
  'zap',
  'rocket',
  'code',
  'layers',
  'box',
  'briefcase',
];

function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCollections = useCallback((newCollections: Collection[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCollections));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }, []);

  const createCollection = useCallback((
    name: string,
    description: string = '',
    color: string = DEFAULT_COLORS[0],
    icon: string = DEFAULT_ICONS[0]
  ): Collection => {
    const now = Date.now();
    const newCollection: Collection = {
      id: generateId(),
      name,
      description,
      color,
      icon,
      skillIds: [],
      createdAt: now,
      updatedAt: now,
    };

    setCollections((prev) => {
      const updated = [...prev, newCollection];
      saveCollections(updated);
      return updated;
    });

    return newCollection;
  }, [saveCollections]);

  const updateCollection = useCallback((
    id: string,
    updates: Partial<Omit<Collection, 'id' | 'createdAt'>>
  ) => {
    setCollections((prev) => {
      const updated = prev.map((col) =>
        col.id === id
          ? { ...col, ...updates, updatedAt: Date.now() }
          : col
      );
      saveCollections(updated);
      return updated;
    });
  }, [saveCollections]);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => {
      const updated = prev.filter((col) => col.id !== id);
      saveCollections(updated);
      return updated;
    });
  }, [saveCollections]);

  const duplicateCollection = useCallback((id: string): Collection | null => {
    const original = collections.find((col) => col.id === id);
    if (!original) return null;

    const now = Date.now();
    const duplicated: Collection = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    setCollections((prev) => {
      const updated = [...prev, duplicated];
      saveCollections(updated);
      return updated;
    });

    return duplicated;
  }, [collections, saveCollections]);

  const addSkillToCollection = useCallback((collectionId: string, skillId: string) => {
    setCollections((prev) => {
      const updated = prev.map((col) => {
        if (col.id !== collectionId) return col;
        if (col.skillIds.includes(skillId)) return col;
        return {
          ...col,
          skillIds: [...col.skillIds, skillId],
          updatedAt: Date.now(),
        };
      });
      saveCollections(updated);
      return updated;
    });
  }, [saveCollections]);

  const removeSkillFromCollection = useCallback((collectionId: string, skillId: string) => {
    setCollections((prev) => {
      const updated = prev.map((col) => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          skillIds: col.skillIds.filter((id) => id !== skillId),
          updatedAt: Date.now(),
        };
      });
      saveCollections(updated);
      return updated;
    });
  }, [saveCollections]);

  const isSkillInCollection = useCallback((collectionId: string, skillId: string): boolean => {
    const collection = collections.find((col) => col.id === collectionId);
    return collection ? collection.skillIds.includes(skillId) : false;
  }, [collections]);

  const getCollectionsForSkill = useCallback((skillId: string): Collection[] => {
    return collections.filter((col) => col.skillIds.includes(skillId));
  }, [collections]);

  const exportCollection = useCallback((id: string): string | null => {
    const collection = collections.find((col) => col.id === id);
    if (!collection) return null;
    return JSON.stringify(collection, null, 2);
  }, [collections]);

  const importCollection = useCallback((jsonString: string): Collection | null => {
    try {
      const imported = JSON.parse(jsonString) as Collection;
      if (!imported.name || !imported.skillIds) {
        throw new Error('Invalid collection format');
      }

      const now = Date.now();
      const newCollection: Collection = {
        ...imported,
        id: generateId(),
        name: imported.name.includes('(Imported)')
          ? imported.name
          : `${imported.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
      };

      setCollections((prev) => {
        const updated = [...prev, newCollection];
        saveCollections(updated);
        return updated;
      });

      return newCollection;
    } catch {
      return null;
    }
  }, [saveCollections]);

  const collectionsCount = collections.length;

  const totalSkillsInCollections = useMemo(() => {
    const uniqueSkills = new Set<string>();
    collections.forEach((col) => {
      col.skillIds.forEach((id) => uniqueSkills.add(id));
    });
    return uniqueSkills.size;
  }, [collections]);

  return {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    duplicateCollection,
    addSkillToCollection,
    removeSkillFromCollection,
    isSkillInCollection,
    getCollectionsForSkill,
    exportCollection,
    importCollection,
    collectionsCount,
    totalSkillsInCollections,
    defaultColors: DEFAULT_COLORS,
    defaultIcons: DEFAULT_ICONS,
  };
}
