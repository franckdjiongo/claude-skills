import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Github,
  Folder,
  ExternalLink,
  Sparkles,
  Database,
  Heart,
  Clock,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import type { Repository, FilterType, Skill } from '../types';
import type { RecentView } from '../hooks';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  // Favorites
  showFavorites: boolean;
  onToggleFavorites: () => void;
  favoritesCount: number;
  // Recent views
  recentViews: RecentView[];
  recentSkills: Skill[];
  onRecentSkillClick: (skill: Skill) => void;
  onClearRecentViews: () => void;
  formatTimestamp: (timestamp: number) => string;
}

export function Sidebar({
  isOpen,
  onClose,
  repositories,
  activeFilter,
  onFilterChange,
  showFavorites,
  onToggleFavorites,
  favoritesCount,
  recentViews,
  recentSkills,
  onRecentSkillClick,
  onClearRecentViews,
  formatTimestamp,
}: SidebarProps) {
  const handleFilterSelect = (filter: FilterType) => {
    onFilterChange(filter);
    onClose();
  };

  const handleFavoritesClick = () => {
    onToggleFavorites();
    onClose();
  };

  const totalSkills = repositories.reduce((sum, r) => sum + r.skillCount, 0);
  const localSkills = repositories.find((r) => r.isLocal)?.skillCount || 0;
  const externalSkills = totalSkills - localSkills;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="sidebar glass"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <div className="brand-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="brand-title">Skills Registry</h2>
                  <p className="brand-subtitle mono">{totalSkills} skills</p>
                </div>
              </div>
              <button className="close-button" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="sidebar-content">
              {/* Favorites Section */}
              <div className="filter-section">
                <h3 className="section-title mono">
                  <Heart size={14} />
                  Favorites
                </h3>
                <button
                  className={`filter-option favorites-option ${showFavorites ? 'active' : ''}`}
                  onClick={handleFavoritesClick}
                >
                  <span className="filter-icon favorites">
                    <Heart size={16} fill={showFavorites ? 'currentColor' : 'none'} />
                  </span>
                  <span className="filter-label">My Favorites</span>
                  <span className="filter-count">{favoritesCount}</span>
                </button>
              </div>

              {/* Recent Views Section */}
              {recentViews.length > 0 && (
                <div className="recent-section">
                  <div className="section-header">
                    <h3 className="section-title mono">
                      <Clock size={14} />
                      Recently Viewed
                    </h3>
                    <button
                      className="clear-recent-button"
                      onClick={onClearRecentViews}
                      aria-label="Clear recent views"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="recent-list">
                    {recentSkills.slice(0, 5).map((skill) => {
                      const recentView = recentViews.find((v) => v.skillId === skill.id);
                      return (
                        <button
                          key={skill.id}
                          className="recent-item"
                          onClick={() => {
                            onRecentSkillClick(skill);
                            onClose();
                          }}
                        >
                          <div className="recent-item-content">
                            <span className="recent-item-name">{skill.name}</span>
                            <span className="recent-item-time mono">
                              {recentView ? formatTimestamp(recentView.timestamp) : ''}
                            </span>
                          </div>
                          <ChevronRight size={14} className="recent-item-arrow" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Source Filter Section */}
              <div className="filter-section">
                <h3 className="section-title mono">
                  <Database size={14} />
                  Filter by Source
                </h3>
                <div className="filter-options">
                  <button
                    className={`filter-option ${activeFilter === 'all' && !showFavorites ? 'active' : ''}`}
                    onClick={() => handleFilterSelect('all')}
                  >
                    <span className="filter-icon all">
                      <Sparkles size={16} />
                    </span>
                    <span className="filter-label">All Skills</span>
                    <span className="filter-count">{totalSkills}</span>
                  </button>
                  <button
                    className={`filter-option ${activeFilter === 'local' && !showFavorites ? 'active' : ''}`}
                    onClick={() => handleFilterSelect('local')}
                  >
                    <span className="filter-icon local">
                      <Folder size={16} />
                    </span>
                    <span className="filter-label">Local Skills</span>
                    <span className="filter-count">{localSkills}</span>
                  </button>
                  <button
                    className={`filter-option ${activeFilter === 'external' && !showFavorites ? 'active' : ''}`}
                    onClick={() => handleFilterSelect('external')}
                  >
                    <span className="filter-icon external">
                      <ExternalLink size={16} />
                    </span>
                    <span className="filter-label">External Skills</span>
                    <span className="filter-count">{externalSkills}</span>
                  </button>
                </div>
              </div>

              {/* Repositories Section */}
              <div className="repos-section">
                <h3 className="section-title mono">
                  <Github size={14} />
                  Repositories
                </h3>
                <div className="repo-list">
                  {repositories.map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-item"
                    >
                      <div className="repo-header">
                        <span className="repo-name">{repo.name}</span>
                        <span
                          className={`repo-type ${repo.isLocal ? 'local' : 'external'}`}
                        >
                          {repo.isLocal ? 'Local' : 'External'}
                        </span>
                      </div>
                      <p className="repo-description">{repo.description}</p>
                      <div className="repo-stats mono">
                        <span className="skill-count">{repo.skillCount} skills</span>
                        <ExternalLink size={12} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <p className="footer-text mono">
                Built with Claude Skills Library
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
