import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Header,
  CategoryChips,
  SkillGrid,
  SkillDetail,
  Sidebar,
  ActiveFilters,
} from './components';
import {
  skills,
  categories,
  repositories,
  searchSkills,
  getSkillsByCategory,
  getSkillById,
} from './data/skills';
import {
  useFavorites,
  useRecentViews,
  useUrlState,
  parseUrlState,
  useKeyboardNavigation,
} from './hooks';
import type { Skill, FilterType } from './types';
import './styles/globals.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const {
    favorites,
    favoritesCount,
    toggleFavorite,
    isFavorite,
  } = useFavorites();

  const {
    recentViews,
    addRecentView,
    clearRecentViews,
    formatTimestamp,
  } = useRecentViews();

  // URL state management
  const { updateUrl } = useUrlState({
    searchQuery,
    activeCategory,
    activeFilter,
    selectedSkillId: selectedSkill?.id || null,
    showFavorites,
  });

  // Initialize from URL on mount
  useEffect(() => {
    const urlState = parseUrlState();

    if (urlState.searchQuery) setSearchQuery(urlState.searchQuery);
    if (urlState.activeCategory) setActiveCategory(urlState.activeCategory);
    if (urlState.activeFilter) setActiveFilter(urlState.activeFilter);
    if (urlState.showFavorites) setShowFavorites(urlState.showFavorites);
    if (urlState.selectedSkillId) {
      const skill = getSkillById(urlState.selectedSkillId);
      if (skill) setSelectedSkill(skill);
    }

    setIsInitialized(true);
  }, []);

  // Update URL when state changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    updateUrl({
      searchQuery,
      activeCategory,
      activeFilter,
      selectedSkillId: selectedSkill?.id || null,
      showFavorites,
    });
  }, [searchQuery, activeCategory, activeFilter, selectedSkill, showFavorites, isInitialized, updateUrl]);

  // Filter skills based on all active filters
  const filteredSkills = useMemo(() => {
    let result: Skill[];

    // Start with favorites filter if active
    if (showFavorites) {
      result = skills.filter((skill) => favorites.has(skill.id));
    } else if (searchQuery) {
      result = searchSkills(searchQuery);
    } else {
      result = getSkillsByCategory(activeCategory);
    }

    // Apply source filter
    if (activeFilter === 'local') {
      result = result.filter((skill) => skill.isLocal);
    } else if (activeFilter === 'external') {
      result = result.filter((skill) => !skill.isLocal);
    }

    return result;
  }, [searchQuery, activeCategory, activeFilter, showFavorites, favorites]);

  // Get recent skills for sidebar
  const recentSkills = useMemo(() => {
    return recentViews
      .map((view) => getSkillById(view.skillId))
      .filter((skill): skill is Skill => skill !== undefined);
  }, [recentViews]);

  // Filter categories based on active filter
  const filteredCategories = useMemo(() => {
    if (activeFilter === 'all') return categories;

    return categories
      .map((cat) => {
        const catSkills = getSkillsByCategory(cat.id).filter((skill) =>
          activeFilter === 'local' ? skill.isLocal : !skill.isLocal
        );
        return { ...cat, skillCount: catSkills.length };
      })
      .filter((cat) => cat.skillCount > 0 || cat.id === 'all');
  }, [activeFilter]);

  // Get current category name for ActiveFilters
  const currentCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategory);
    return cat?.name || 'All Skills';
  }, [activeCategory]);

  // Total visible skills count
  const totalVisibleSkills = useMemo(() => {
    if (activeFilter === 'local') {
      return skills.filter((s) => s.isLocal).length;
    } else if (activeFilter === 'external') {
      return skills.filter((s) => !s.isLocal).length;
    }
    return skills.length;
  }, [activeFilter]);

  // Keyboard navigation
  const {
    focusedIndex,
    gridRef,
  } = useKeyboardNavigation({
    skills: filteredSkills,
    onSkillSelect: (skill) => {
      setSelectedSkill(skill);
      addRecentView(skill.id);
    },
    onSearchFocus: () => {
      searchInputRef.current?.focus();
    },
    columnsCount: window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1,
  });

  // Handlers
  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
    setShowFavorites(false);
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setActiveCategory('all');
    setSearchQuery('');
    setShowFavorites(false);
  }, []);

  const handleSkillClick = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    addRecentView(skill.id);
  }, [addRecentView]);

  const handleCloseDetail = useCallback(() => {
    setSelectedSkill(null);
  }, []);

  const handleToggleFavorites = useCallback(() => {
    setShowFavorites((prev) => !prev);
    if (!showFavorites) {
      setActiveCategory('all');
      setSearchQuery('');
    }
  }, [showFavorites]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) {
      setShowFavorites(false);
    }
  }, []);

  // Clear handlers for ActiveFilters
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleClearCategory = useCallback(() => {
    setActiveCategory('all');
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveFilter('all');
  }, []);

  const handleClearFavorites = useCallback(() => {
    setShowFavorites(false);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
    setActiveFilter('all');
    setShowFavorites(false);
  }, []);

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalSkills={totalVisibleSkills}
        onMenuClick={() => setIsSidebarOpen(true)}
        searchInputRef={searchInputRef}
        favoritesCount={favoritesCount}
      />

      <CategoryChips
        categories={filteredCategories}
        activeCategory={showFavorites ? '' : activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      <ActiveFilters
        searchQuery={searchQuery}
        activeCategory={activeCategory}
        categoryName={currentCategoryName}
        activeFilter={activeFilter}
        showFavorites={showFavorites}
        favoritesCount={favoritesCount}
        resultCount={filteredSkills.length}
        onClearSearch={handleClearSearch}
        onClearCategory={handleClearCategory}
        onClearFilter={handleClearFilter}
        onClearFavorites={handleClearFavorites}
        onClearAll={handleClearAll}
      />

      <main>
        <SkillGrid
          ref={gridRef}
          skills={filteredSkills}
          searchQuery={searchQuery}
          onSkillClick={handleSkillClick}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          focusedIndex={focusedIndex}
          showFavorites={showFavorites}
        />
      </main>

      <SkillDetail
        skill={selectedSkill}
        onClose={handleCloseDetail}
        isFavorite={selectedSkill ? isFavorite(selectedSkill.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        repositories={repositories}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        showFavorites={showFavorites}
        onToggleFavorites={handleToggleFavorites}
        favoritesCount={favoritesCount}
        recentViews={recentViews}
        recentSkills={recentSkills}
        onRecentSkillClick={handleSkillClick}
        onClearRecentViews={clearRecentViews}
        formatTimestamp={formatTimestamp}
      />
    </div>
  );
}

export default App;
