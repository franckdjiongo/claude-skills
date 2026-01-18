import { useState, useMemo, useCallback } from 'react';
import {
  Header,
  CategoryChips,
  SkillGrid,
  SkillDetail,
  Sidebar,
} from './components';
import {
  skills,
  categories,
  repositories,
  searchSkills,
  getSkillsByCategory,
} from './data/skills';
import type { Skill, FilterType } from './types';
import './styles/globals.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredSkills = useMemo(() => {
    let result = searchQuery
      ? searchSkills(searchQuery)
      : getSkillsByCategory(activeCategory);

    if (activeFilter === 'local') {
      result = result.filter((skill) => skill.isLocal);
    } else if (activeFilter === 'external') {
      result = result.filter((skill) => !skill.isLocal);
    }

    return result;
  }, [searchQuery, activeCategory, activeFilter]);

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

  const totalVisibleSkills = useMemo(() => {
    if (activeFilter === 'local') {
      return skills.filter((s) => s.isLocal).length;
    } else if (activeFilter === 'external') {
      return skills.filter((s) => !s.isLocal).length;
    }
    return skills.length;
  }, [activeFilter]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setActiveCategory('all');
    setSearchQuery('');
  }, []);

  const handleSkillClick = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSkill(null);
  }, []);

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalSkills={totalVisibleSkills}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <CategoryChips
        categories={filteredCategories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      <main>
        <SkillGrid
          skills={filteredSkills}
          searchQuery={searchQuery}
          onSkillClick={handleSkillClick}
        />
      </main>

      <SkillDetail skill={selectedSkill} onClose={handleCloseDetail} />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        repositories={repositories}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

export default App;
