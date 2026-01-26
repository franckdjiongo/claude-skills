import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  FolderOpen,
  Tag,
  GitBranch,
  TrendingUp,
  BarChart3,
  Layers,
  Heart,
  Zap,
} from 'lucide-react';
import { skills, categories, repositories, getRepositoryColor } from '../data/skills';
import './StatsDashboard.css';

interface StatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  favoritesCount?: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
  delay?: number;
}

function StatCard({ icon, label, value, accent = 'cyan', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      className={`stat-card accent-${accent}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </motion.div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  delay?: number;
}

function ProgressBar({ label, value, max, color, delay = 0 }: ProgressBarProps) {
  const percentage = (value / max) * 100;

  return (
    <motion.div
      className="progress-row"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="progress-info">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{value}</span>
      </div>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
        <div className="progress-glow" style={{ background: color }} />
      </div>
    </motion.div>
  );
}

export function StatsDashboard({ isOpen, onClose, favoritesCount = 0 }: StatsDashboardProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalSkills = skills.length;
    const totalCategories = categories.filter((c) => c.id !== 'all').length;
    const totalRepositories = repositories.length;

    // Get all unique tags
    const tagMap = new Map<string, number>();
    skills.forEach((skill) => {
      skill.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    const totalTags = tagMap.size;
    const avgTagsPerSkill = (
      skills.reduce((sum, s) => sum + s.tags.length, 0) / totalSkills
    ).toFixed(1);

    // Top tags
    const topTags = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Repository distribution
    const repoDistribution = repositories.map((repo) => ({
      name: repo.name,
      count: skills.filter((s) => s.repository === repo.id).length,
      color: getRepositoryColor(repo.id as 'claude-skills' | 'superpowers' | 'anthropic-skills' | 'antigravity-kit'),
    }));

    // Category distribution (top 8)
    const categoryDistribution = categories
      .filter((c) => c.id !== 'all')
      .sort((a, b) => b.skillCount - a.skillCount)
      .slice(0, 8)
      .map((cat) => ({
        name: cat.name,
        count: cat.skillCount,
      }));

    // Local vs external
    const localCount = skills.filter((s) => s.isLocal).length;
    const externalCount = totalSkills - localCount;

    return {
      totalSkills,
      totalCategories,
      totalRepositories,
      totalTags,
      avgTagsPerSkill,
      topTags,
      repoDistribution,
      categoryDistribution,
      localCount,
      externalCount,
    };
  }, []);

  const maxCategoryCount = Math.max(...stats.categoryDistribution.map((c) => c.count));
  const maxRepoCount = Math.max(...stats.repoDistribution.map((r) => r.count));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="stats-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="stats-dashboard"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stats-glow" />
            <div className="stats-border" />

            <div className="stats-header">
              <div className="stats-title-section">
                <BarChart3 size={24} className="stats-icon" />
                <div>
                  <h2 className="stats-title">Skills Analytics</h2>
                  <p className="stats-subtitle">Library overview & insights</p>
                </div>
              </div>
              <button className="stats-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="stats-content">
              {/* Overview Cards */}
              <section className="stats-section">
                <h3 className="section-title">
                  <Zap size={16} />
                  Overview
                </h3>
                <div className="stat-cards-grid">
                  <StatCard
                    icon={<Sparkles size={20} />}
                    label="Total Skills"
                    value={stats.totalSkills}
                    accent="cyan"
                    delay={0.1}
                  />
                  <StatCard
                    icon={<FolderOpen size={20} />}
                    label="Categories"
                    value={stats.totalCategories}
                    accent="magenta"
                    delay={0.15}
                  />
                  <StatCard
                    icon={<GitBranch size={20} />}
                    label="Repositories"
                    value={stats.totalRepositories}
                    accent="gold"
                    delay={0.2}
                  />
                  <StatCard
                    icon={<Tag size={20} />}
                    label="Unique Tags"
                    value={stats.totalTags}
                    accent="green"
                    delay={0.25}
                  />
                </div>
              </section>

              {/* Repository Distribution */}
              <section className="stats-section">
                <h3 className="section-title">
                  <GitBranch size={16} />
                  Repository Distribution
                </h3>
                <div className="progress-bars">
                  {stats.repoDistribution.map((repo, i) => (
                    <ProgressBar
                      key={repo.name}
                      label={repo.name}
                      value={repo.count}
                      max={maxRepoCount}
                      color={repo.color}
                      delay={0.3 + i * 0.1}
                    />
                  ))}
                </div>
              </section>

              {/* Category Distribution */}
              <section className="stats-section">
                <h3 className="section-title">
                  <Layers size={16} />
                  Top Categories
                </h3>
                <div className="progress-bars">
                  {stats.categoryDistribution.map((cat, i) => (
                    <ProgressBar
                      key={cat.name}
                      label={cat.name}
                      value={cat.count}
                      max={maxCategoryCount}
                      color={`hsl(${180 + i * 20}, 80%, 60%)`}
                      delay={0.5 + i * 0.05}
                    />
                  ))}
                </div>
              </section>

              {/* Tag Cloud */}
              <section className="stats-section">
                <h3 className="section-title">
                  <TrendingUp size={16} />
                  Popular Tags
                </h3>
                <motion.div
                  className="tag-cloud"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {stats.topTags.map(([tag, count], i) => {
                    const size = 0.7 + (count / stats.topTags[0][1]) * 0.5;
                    return (
                      <motion.span
                        key={tag}
                        className="cloud-tag"
                        style={{ fontSize: `${size}rem` }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.05 }}
                      >
                        {tag}
                        <span className="tag-count">{count}</span>
                      </motion.span>
                    );
                  })}
                </motion.div>
              </section>

              {/* Quick Stats */}
              <section className="stats-section">
                <h3 className="section-title">
                  <Heart size={16} />
                  Quick Stats
                </h3>
                <div className="quick-stats">
                  <div className="quick-stat">
                    <span className="quick-stat-label">Local Skills</span>
                    <span className="quick-stat-value">{stats.localCount}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="quick-stat-label">External Skills</span>
                    <span className="quick-stat-value">{stats.externalCount}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="quick-stat-label">Avg Tags/Skill</span>
                    <span className="quick-stat-value">{stats.avgTagsPerSkill}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="quick-stat-label">Your Favorites</span>
                    <span className="quick-stat-value highlight">{favoritesCount}</span>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
