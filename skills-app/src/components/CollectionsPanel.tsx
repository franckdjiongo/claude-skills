import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Folder,
  Star,
  Zap,
  Rocket,
  Code,
  Layers,
  Box,
  Briefcase,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import type { Collection } from '../hooks/useCollections';
import './CollectionsPanel.css';

interface CollectionsPanelProps {
  collections: Collection[];
  selectedCollectionId?: string;
  onSelectCollection: (collectionId: string | null) => void;
  onCreateCollection: (name: string, description: string, color: string, icon: string) => void;
  onDeleteCollection: (id: string) => void;
  onDuplicateCollection: (id: string) => void;
  onExportCollection: (id: string) => string | null;
  onImportCollection: (json: string) => void;
  defaultColors: string[];
  defaultIcons: string[];
}

const iconComponents: Record<string, typeof Folder> = {
  folder: Folder,
  star: Star,
  zap: Zap,
  rocket: Rocket,
  code: Code,
  layers: Layers,
  box: Box,
  briefcase: Briefcase,
};

export function CollectionsPanel({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onDuplicateCollection,
  onExportCollection,
  onImportCollection,
  defaultColors,
  defaultIcons,
}: CollectionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(defaultColors[0]);
  const [newIcon, setNewIcon] = useState(defaultIcons[0]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateCollection(newName.trim(), newDescription.trim(), newColor, newIcon);
    setNewName('');
    setNewDescription('');
    setNewColor(defaultColors[0]);
    setNewIcon(defaultIcons[0]);
    setIsCreating(false);
  };

  const handleExport = (id: string) => {
    const json = onExportCollection(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setMenuOpenId(null);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        onImportCollection(text);
      }
    };
    input.click();
  };

  return (
    <div className="collections-panel">
      <button
        className="collections-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="collections-header-left">
          <Layers size={16} />
          <span>Collections</span>
          {collections.length > 0 && (
            <span className="collections-count">{collections.length}</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="collections-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Create New Collection Form */}
            <AnimatePresence>
              {isCreating && (
                <motion.div
                  className="collection-create-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Collection name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="collection-input"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="collection-input"
                  />

                  <div className="collection-options">
                    <div className="option-group">
                      <label className="option-label">Color</label>
                      <div className="color-picker">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            className={`color-swatch ${color === newColor ? 'selected' : ''}`}
                            style={{ background: color }}
                            onClick={() => setNewColor(color)}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="option-group">
                      <label className="option-label">Icon</label>
                      <div className="icon-picker">
                        {defaultIcons.map((iconName) => {
                          const Icon = iconComponents[iconName] || Folder;
                          return (
                            <button
                              key={iconName}
                              className={`icon-option ${iconName === newIcon ? 'selected' : ''}`}
                              onClick={() => setNewIcon(iconName)}
                              aria-label={`Select ${iconName} icon`}
                            >
                              <Icon size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="collection-form-actions">
                    <button
                      className="form-action cancel"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="form-action create"
                      onClick={handleCreate}
                      disabled={!newName.trim()}
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collection List */}
            <div className="collections-list">
              {collections.map((collection) => {
                const Icon = iconComponents[collection.icon] || Folder;
                const isSelected = selectedCollectionId === collection.id;
                const isMenuOpen = menuOpenId === collection.id;

                return (
                  <div
                    key={collection.id}
                    className={`collection-item ${isSelected ? 'selected' : ''}`}
                    style={{ '--collection-color': collection.color } as React.CSSProperties}
                  >
                    <button
                      className="collection-item-main"
                      onClick={() => onSelectCollection(isSelected ? null : collection.id)}
                    >
                      <div className="collection-icon" style={{ color: collection.color }}>
                        <Icon size={14} />
                      </div>
                      <div className="collection-info">
                        <span className="collection-name">{collection.name}</span>
                        <span className="collection-skill-count">
                          {collection.skillIds.length} skills
                        </span>
                      </div>
                    </button>

                    <div className="collection-menu-wrapper">
                      <button
                        className="collection-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(isMenuOpen ? null : collection.id);
                        }}
                        aria-label="Collection menu"
                      >
                        <MoreVertical size={14} />
                      </button>

                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            className="collection-menu"
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            <button
                              className="menu-item"
                              onClick={() => {
                                onDuplicateCollection(collection.id);
                                setMenuOpenId(null);
                              }}
                            >
                              <Copy size={12} />
                              Duplicate
                            </button>
                            <button
                              className="menu-item"
                              onClick={() => handleExport(collection.id)}
                            >
                              <Download size={12} />
                              Export
                            </button>
                            <button
                              className="menu-item danger"
                              onClick={() => {
                                onDeleteCollection(collection.id);
                                setMenuOpenId(null);
                              }}
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="collections-actions">
              {!isCreating && (
                <button
                  className="collection-action-btn create-btn"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={14} />
                  New Collection
                </button>
              )}
              <button className="collection-action-btn import-btn" onClick={handleImport}>
                <Upload size={14} />
                Import
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
