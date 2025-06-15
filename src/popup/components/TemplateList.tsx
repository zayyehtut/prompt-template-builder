import { useState, useMemo } from 'react';
import type { Template } from '@/types/storage';

interface TemplateListProps {
  templates: Template[];
  searchQuery: string;
  onSearch: (query: string) => void;
  onSelect: (template: Template) => void;
  onEdit: (template: Template) => void;
  onNew: () => void;
  onDelete?: (template: Template) => void;
  onToggleFavorite?: (template: Template) => void;
}

export function TemplateList({
  templates,
  searchQuery,
  onSearch,
  onSelect,
  onEdit,
  onNew,
  onDelete,
  onToggleFavorite,
}: TemplateListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'recent'>('recent');

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.content.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter((template) => template.favorite);
      } else {
        filtered = filtered.filter((template) => template.category === selectedCategory);
      }
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'recent':
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return filtered;
  }, [templates, searchQuery, selectedCategory, sortBy]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [templates]);

  const favoriteCount = templates.filter((t) => t.favorite).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Templates
          </h1>
          <button
            onClick={onNew}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + New
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All ({templates.length})</option>
            <option value="favorites">Favorites ({favoriteCount})</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category} ({templates.filter((t) => t.category === category).length})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="usage">Most Used</option>
          </select>
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg
              className="w-12 h-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">
              {searchQuery ? 'No templates found' : 'No templates yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNew}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Create your first template
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTemplates.map((template) => (
              <TemplateItem
                key={template.id}
                template={template}
                onSelect={() => onSelect(template)}
                onEdit={() => onEdit(template)}
                onDelete={onDelete ? () => onDelete(template) : undefined}
                onToggleFavorite={
                  onToggleFavorite ? () => onToggleFavorite(template) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateItemProps {
  template: Template;
  onSelect: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

function TemplateItem({
  template,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: TemplateItemProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="group relative p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div onClick={onSelect}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {template.name}
              </h3>
              {template.favorite && (
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {truncateContent(template.content)}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {template.category && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                  {template.category}
                </span>
              )}
              <span>{template.variables?.length || 0} variables</span>
              <span>Used {template.usageCount || 0} times</span>
              <span>Updated {formatDate(template.updatedAt || template.createdAt)}</span>
            </div>
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300"
                  >
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{template.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-1.5 text-gray-400 hover:text-yellow-500 focus:outline-none"
              title={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-4 h-4" fill={template.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 focus:outline-none"
            title="Edit template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete template "${template.name}"?`)) {
                  onDelete();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 focus:outline-none"
              title="Delete template"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
} 