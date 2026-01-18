import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  Folder,
  Tag,
  Copy,
  Check,
  GitBranch,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import type { Skill } from '../types';
import { getRepositoryColor, repositories } from '../data/skills';
import './SkillDetail.css';

interface SkillDetailProps {
  skill: Skill | null;
  onClose: () => void;
}

export function SkillDetail({ skill, onClose }: SkillDetailProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (skill) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [skill]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleCopy = async () => {
    if (!skill) return;
    const text = skill.isLocal
      ? `/${skill.id}`
      : skill.externalUrl || skill.path;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const repo = skill
    ? repositories.find((r) => r.id === skill.repository)
    : null;

  return (
    <AnimatePresence>
      {skill && (
        <>
          <motion.div
            className="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="detail-container"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
          >
            <div className="detail-sheet glass">
              <div className="detail-handle" onClick={onClose}>
                <div className="handle-bar" />
              </div>

              <button
                className="detail-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="detail-content hide-scrollbar">
                <div
                  className="detail-header"
                  style={
                    {
                      '--repo-color': getRepositoryColor(skill.repository),
                    } as React.CSSProperties
                  }
                >
                  <div className="detail-repo-badge">
                    {skill.isLocal ? (
                      <Folder size={14} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    <span>{repo?.name || skill.repository}</span>
                  </div>
                  <h2 className="detail-title">{skill.name}</h2>
                  <p className="detail-description">{skill.description}</p>
                </div>

                <div className="detail-section">
                  <h4 className="section-label mono">
                    <Tag size={14} />
                    Tags
                  </h4>
                  <div className="detail-tags">
                    {skill.tags.map((tag) => (
                      <span key={tag} className="detail-tag mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-label mono">
                    <GitBranch size={14} />
                    Repository
                  </h4>
                  <div className="detail-repo-info">
                    <p className="repo-description">{repo?.description}</p>
                    <a
                      href={repo?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-link"
                    >
                      <span>View on GitHub</span>
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-label mono">
                    <FileCode size={14} />
                    Path
                  </h4>
                  <div className="detail-path">
                    <code className="path-code mono">{skill.path}</code>
                    <button
                      className="copy-button"
                      onClick={handleCopy}
                      aria-label="Copy path"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="detail-actions">
                  {skill.isLocal ? (
                    <button className="action-button primary" onClick={handleCopy}>
                      <span>/{skill.id}</span>
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  ) : (
                    <a
                      href={skill.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-button primary"
                    >
                      <span>View Skill</span>
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <button className="action-button secondary" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
