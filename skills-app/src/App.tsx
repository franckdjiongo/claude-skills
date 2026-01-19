import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Header,
  CategoryChips,
  SkillGrid,
  SkillDetail,
  Sidebar,
  ActiveFilters,
  Toast,
  TagFilter,
  FloatingActionButton,
  KeyboardShortcutsModal,
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
  useToast,
  useViewMode,
  useSortSkills,
  useTagFilter,
  useScrollPosition,
  useTheme,
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
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Theme hook
  const { theme, toggleTheme } = useTheme();

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

  // New hooks for enhanced features
  const { toasts, removeToast, success, info } = useToast();
  const { viewMode, toggleViewMode } = useViewMode();
  const { sortBy, setSortBy, sortSkills } = useSortSkills();
  const {
    popularTags,
    allTags,
    tagCounts,
    selectedTagsArray,
    hasSelectedTags,
    toggleTag,
    clearTags,
    filterByTags,
  } = useTagFilter();
  const { showScrollTop, scrollToTop } = useScrollPosition();

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

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // ? key for shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // Apply tag filter
    result = filterByTags(result);

    // Apply sorting
    result = sortSkills(result);

    return result;
  }, [searchQuery, activeCategory, activeFilter, showFavorites, favorites, filterByTags, sortSkills]);

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

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      activeCategory !== 'all' ||
      activeFilter !== 'all' ||
      showFavorites ||
      hasSelectedTags
    );
  }, [searchQuery, activeCategory, activeFilter, showFavorites, hasSelectedTags]);

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

  // Enhanced favorite toggle with toast
  const handleToggleFavorite = useCallback((skillId: string) => {
    const wasFavorite = isFavorite(skillId);
    toggleFavorite(skillId);
    const skill = getSkillById(skillId);
    if (skill) {
      if (wasFavorite) {
        info(`Removed "${skill.name}" from favorites`);
      } else {
        success(`Added "${skill.name}" to favorites`);
      }
    }
  }, [toggleFavorite, isFavorite, success, info]);

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
    clearTags();
    info('All filters cleared');
  }, [clearTags, info]);

  // Random skill selection
  const handleRandomSkill = useCallback(() => {
    const availableSkills = filteredSkills.length > 0 ? filteredSkills : skills;
    const randomIndex = Math.floor(Math.random() * availableSkills.length);
    const randomSkill = availableSkills[randomIndex];
    if (randomSkill) {
      setSelectedSkill(randomSkill);
      addRecentView(randomSkill.id);
      success(`Found "${randomSkill.name}"!`);
    }
  }, [filteredSkills, addRecentView, success]);

  // Tag click handler from list items
  const handleTagClick = useCallback((tag: string) => {
    toggleTag(tag);
  }, [toggleTag]);

  // Share handler for skill detail
  const handleShare = useCallback((message: string) => {
    info(message);
  }, [info]);

  // Similar skill click handler (navigates to another skill within detail modal)
  const handleSimilarSkillClick = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    addRecentView(skill.id);
  }, [addRecentView]);

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalSkills={totalVisibleSkills}
        onMenuClick={() => setIsSidebarOpen(true)}
        searchInputRef={searchInputRef}
        favoritesCount={favoritesCount}
        viewMode={viewMode}
        onViewModeToggle={toggleViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        theme={theme}
        onThemeToggle={toggleTheme}
        onHelpClick={() => setIsShortcutsModalOpen(true)}
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
        selectedTags={selectedTagsArray}
        onClearSearch={handleClearSearch}
        onClearCategory={handleClearCategory}
        onClearFilter={handleClearFilter}
        onClearFavorites={handleClearFavorites}
        onClearTag={toggleTag}
        onClearAll={handleClearAll}
      />

      <main>
        <SkillGrid
          ref={gridRef}
          skills={filteredSkills}
          searchQuery={searchQuery}
          onSkillClick={handleSkillClick}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          focusedIndex={focusedIndex}
          showFavorites={showFavorites}
          viewMode={viewMode}
          onTagClick={handleTagClick}
        />
      </main>

      <SkillDetail
        skill={selectedSkill}
        onClose={handleCloseDetail}
        isFavorite={selectedSkill ? isFavorite(selectedSkill.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onSkillClick={handleSimilarSkillClick}
        onShare={handleShare}
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
        tagFilterComponent={
          <TagFilter
            popularTags={popularTags}
            allTags={allTags}
            tagCounts={tagCounts}
            selectedTags={selectedTagsArray}
            onToggleTag={toggleTag}
            onClearTags={clearTags}
          />
        }
      />

      <Toast toasts={toasts} onRemove={removeToast} />

      <FloatingActionButton
        showScrollTop={showScrollTop}
        onScrollTop={scrollToTop}
        onRandomSkill={handleRandomSkill}
        onClearFilters={handleClearAll}
        hasActiveFilters={hasActiveFilters}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default App;
