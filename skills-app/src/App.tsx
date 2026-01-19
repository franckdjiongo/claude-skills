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
  SearchSuggestions,
  SkillPreview,
  StatsDashboard,
  ComparisonBar,
  ComparisonModal,
  CollectionsPanel,
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
  useSearchHistory,
  useComparison,
  useCollections,
} from './hooks';
import type { Skill, FilterType } from './types';
import type { Suggestion } from './hooks';
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

  // New feature states
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const { toasts, removeToast, success, info, warning } = useToast();
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

  // New feature hooks
  const {
    addToHistory,
    clearHistory,
    removeFromHistory,
    getSuggestions,
  } = useSearchHistory();

  const {
    comparisonSkills,
    toggleComparison,
    clearComparison,
    removeFromComparison,
    isInComparison,
    canAddMore: canAddToComparison,
    canCompare,
    maxComparison,
  } = useComparison();

  const {
    collections,
    createCollection,
    deleteCollection,
    duplicateCollection,
    exportCollection,
    importCollection,
    defaultColors,
    defaultIcons,
  } = useCollections();

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
      // Don't trigger if typing in input (except for Escape)
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Handle search suggestions keyboard navigation
      if (isInInput && showSearchSuggestions) {
        const suggestions = getSuggestions(searchQuery);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && suggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionSelect(suggestions[suggestionIndex]);
        } else if (e.key === 'Escape') {
          setShowSearchSuggestions(false);
          setSuggestionIndex(-1);
        }
        return;
      }

      if (isInInput) return;

      // ? key for shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }

      // S key for stats
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsStatsOpen(true);
      }

      // C key for comparison
      if ((e.key === 'c' || e.key === 'C') && canCompare) {
        e.preventDefault();
        setIsComparisonModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchSuggestions, searchQuery, suggestionIndex, getSuggestions, canCompare]);

  // Filter skills based on all active filters
  const filteredSkills = useMemo(() => {
    let result: Skill[];

    // Check if filtering by collection
    if (selectedCollectionId) {
      const collection = collections.find((c) => c.id === selectedCollectionId);
      if (collection) {
        result = skills.filter((skill) => collection.skillIds.includes(skill.id));
      } else {
        result = [];
      }
    } else if (showFavorites) {
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
  }, [searchQuery, activeCategory, activeFilter, showFavorites, favorites, filterByTags, sortSkills, selectedCollectionId, collections]);

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
      hasSelectedTags ||
      selectedCollectionId !== null
    );
  }, [searchQuery, activeCategory, activeFilter, showFavorites, hasSelectedTags, selectedCollectionId]);

  // Get search suggestions
  const suggestions = useMemo(() => {
    return getSuggestions(searchQuery);
  }, [searchQuery, getSuggestions]);

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
    setSelectedCollectionId(null);
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setActiveCategory('all');
    setSearchQuery('');
    setShowFavorites(false);
    setSelectedCollectionId(null);
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
      setSelectedCollectionId(null);
    }
  }, [showFavorites]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSuggestionIndex(-1);
    if (query) {
      setShowFavorites(false);
      setSelectedCollectionId(null);
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowSearchSuggestions(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    // Delay to allow click on suggestions
    setTimeout(() => {
      setShowSearchSuggestions(false);
      setSuggestionIndex(-1);
    }, 200);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      addToHistory(searchQuery.trim());
    }
    setShowSearchSuggestions(false);
  }, [searchQuery, addToHistory]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === 'category') {
      const categoryId = suggestion.value.replace('category:', '');
      handleCategoryChange(categoryId);
    } else if (suggestion.type === 'tag') {
      const tag = suggestion.value.replace('tag:', '');
      toggleTag(tag);
      setSearchQuery('');
    } else {
      setSearchQuery(suggestion.displayText);
      addToHistory(suggestion.displayText);
    }
    setShowSearchSuggestions(false);
    setSuggestionIndex(-1);
  }, [handleCategoryChange, toggleTag, addToHistory]);

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

  // Handle comparison toggle
  const handleToggleComparison = useCallback((skill: Skill) => {
    const wasInComparison = isInComparison(skill.id);
    toggleComparison(skill);
    if (wasInComparison) {
      info(`Removed "${skill.name}" from comparison`);
    } else if (canAddToComparison) {
      success(`Added "${skill.name}" to comparison`);
    } else {
      warning(`Comparison is full (max ${maxComparison})`);
    }
  }, [toggleComparison, isInComparison, canAddToComparison, maxComparison, success, info, warning]);

  // Skill preview handlers
  const handleSkillHover = useCallback((skill: Skill, event: React.MouseEvent) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(() => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setPreviewSkill(skill);
      setPreviewPosition({
        x: rect.right + 16,
        y: rect.top,
      });
    }, 300);
  }, []);

  const handleSkillHoverEnd = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    // Don't close immediately - let the preview handle mouse leave
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewSkill(null);
    setPreviewPosition(null);
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

  const handleClearCollection = useCallback(() => {
    setSelectedCollectionId(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
    setActiveFilter('all');
    setShowFavorites(false);
    setSelectedCollectionId(null);
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

  // Collection handlers
  const handleCreateCollection = useCallback((name: string, description: string, color: string, icon: string) => {
    createCollection(name, description, color, icon);
    success(`Created collection "${name}"`);
  }, [createCollection, success]);

  const handleDeleteCollection = useCallback((id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (collection) {
      deleteCollection(id);
      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
      info(`Deleted collection "${collection.name}"`);
    }
  }, [collections, deleteCollection, selectedCollectionId, info]);

  const handleDuplicateCollection = useCallback((id: string) => {
    const duplicated = duplicateCollection(id);
    if (duplicated) {
      success(`Created "${duplicated.name}"`);
    }
  }, [duplicateCollection, success]);

  const handleImportCollection = useCallback((json: string) => {
    const imported = importCollection(json);
    if (imported) {
      success(`Imported "${imported.name}"`);
    } else {
      warning('Failed to import collection');
    }
  }, [importCollection, success, warning]);

  const handleSelectCollection = useCallback((collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    if (collectionId) {
      setShowFavorites(false);
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, []);

  // Get current collection name
  const currentCollectionName = useMemo(() => {
    if (!selectedCollectionId) return null;
    const collection = collections.find((c) => c.id === selectedCollectionId);
    return collection?.name || null;
  }, [selectedCollectionId, collections]);

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onSearchSubmit={handleSearchSubmit}
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
        onStatsClick={() => setIsStatsOpen(true)}
        comparisonCount={comparisonSkills.length}
        onCompareClick={() => canCompare && setIsComparisonModalOpen(true)}
        searchSuggestions={
          <SearchSuggestions
            suggestions={suggestions}
            isVisible={showSearchSuggestions}
            onSelect={handleSuggestionSelect}
            onRemoveHistory={removeFromHistory}
            onClearHistory={clearHistory}
            highlightedIndex={suggestionIndex}
          />
        }
      />

      <CategoryChips
        categories={filteredCategories}
        activeCategory={showFavorites || selectedCollectionId ? '' : activeCategory}
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
        collectionName={currentCollectionName}
        onClearSearch={handleClearSearch}
        onClearCategory={handleClearCategory}
        onClearFilter={handleClearFilter}
        onClearFavorites={handleClearFavorites}
        onClearTag={toggleTag}
        onClearCollection={handleClearCollection}
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
          onSkillHover={handleSkillHover}
          onSkillHoverEnd={handleSkillHoverEnd}
          isInComparison={isInComparison}
          onToggleComparison={handleToggleComparison}
          canAddToComparison={canAddToComparison}
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

      <SkillPreview
        skill={previewSkill}
        position={previewPosition}
        onClose={handleClosePreview}
        onOpenDetail={handleSkillClick}
        onToggleFavorite={handleToggleFavorite}
        onToggleComparison={handleToggleComparison}
        isFavorite={previewSkill ? isFavorite(previewSkill.id) : false}
        isInComparison={previewSkill ? isInComparison(previewSkill.id) : false}
        canAddToComparison={canAddToComparison}
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
        collectionsComponent={
          <CollectionsPanel
            collections={collections}
            selectedCollectionId={selectedCollectionId ?? undefined}
            onSelectCollection={handleSelectCollection}
            onCreateCollection={handleCreateCollection}
            onDeleteCollection={handleDeleteCollection}
            onDuplicateCollection={handleDuplicateCollection}
            onExportCollection={exportCollection}
            onImportCollection={handleImportCollection}
            defaultColors={defaultColors}
            defaultIcons={defaultIcons}
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

      <StatsDashboard
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        favoritesCount={favoritesCount}
      />

      <ComparisonBar
        skills={comparisonSkills}
        onRemove={removeFromComparison}
        onClear={clearComparison}
        onCompare={() => setIsComparisonModalOpen(true)}
        maxComparison={maxComparison}
      />

      <ComparisonModal
        isOpen={isComparisonModalOpen}
        skills={comparisonSkills}
        onClose={() => setIsComparisonModalOpen(false)}
      />
    </div>
  );
}

export default App;
