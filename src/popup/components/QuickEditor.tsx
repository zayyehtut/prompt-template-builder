import React, { useState, useEffect, useMemo } from 'react';
import { parseTemplate } from '@/lib/template-parser';
import type { Template } from '@/types/storage';
import { nanoid } from 'nanoid';

interface QuickEditorProps {
  template?: Template | null;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

export function QuickEditor({ template, onSave, onCancel }: QuickEditorProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with template data
  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || '');
      setTags(template.tags || []);
      setFavorite(template.favorite || false);
    } else {
      // Reset form for new template
      setName('');
      setContent('');
      setCategory('');
      setTags([]);
      setFavorite(false);
    }
    setErrors({});
  }, [template]);

  // Parse variables from content
  const parsedData = useMemo(() => {
    if (!content.trim()) {
      return { variables: [], plainText: '' };
    }
    return parseTemplate(content);
  }, [content]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Template content is required';
    }

    // Check for invalid variable syntax
    const invalidVariables = content.match(/\{\{[^}]*\}\}/g)?.filter(match => {
      const inner = match.slice(2, -2).trim();
      return !inner || inner.includes('{') || inner.includes('}');
    });

    if (invalidVariables && invalidVariables.length > 0) {
      newErrors.content = `Invalid variable syntax: ${invalidVariables.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const now = Date.now();
    const templateData: Template = {
      id: template?.id || nanoid(),
      name: name.trim(),
      content: content.trim(),
      variables: parsedData.variables,
      category: category.trim() || undefined,
      tags: tags.filter(tag => tag.trim()),
      createdAt: template?.createdAt || now,
      updatedAt: now,
      usageCount: template?.usageCount || 0,
      favorite,
    };

    onSave(templateData);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const insertVariable = (varName: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + `{{${varName}}}` + content.slice(end);
      setContent(newContent);
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
      }, 0);
    }
  };

  const commonVariables = [
    'NAME', 'EMAIL', 'COMPANY', 'DATE', 'TIME',
    'TITLE', 'DESCRIPTION', 'URL', 'AMOUNT', 'QUANTITY'
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter template name..."
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
              errors.name
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Template Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Template Content *
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {parsedData.variables.length} variables detected
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your template content with variables like {{NAME}}..."
            rows={8}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none ${
              errors.content
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.content}</p>
          )}
          
          {/* Variable Helper */}
          {content && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Use variables like: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{{NAME}}'}</code>,{' '}
                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{{EMAIL:text}}'}</code>,{' '}
                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{{COUNT:number}}'}</code>
              </p>
              <div className="flex flex-wrap gap-1">
                {commonVariables.map((varName) => (
                  <button
                    key={varName}
                    onClick={() => insertVariable(varName)}
                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    {varName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detected Variables */}
        {parsedData.variables.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detected Variables
            </label>
            <div className="space-y-2">
              {parsedData.variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {variable.name}
                    </code>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {variable.type}
                    </span>
                    {variable.required && (
                      <span className="text-xs text-red-600 dark:text-red-400">required</span>
                    )}
                  </div>
                                     {variable.defaultValue !== undefined && (
                     <span className="text-xs text-gray-500 dark:text-gray-400">
                       default: {String(variable.defaultValue)}
                     </span>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., email, code, writing..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Add
            </button>
          </div>
        </div>

        {/* Favorite */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="favorite"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <label htmlFor="favorite" className="text-sm text-gray-700 dark:text-gray-300">
            Mark as favorite
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Press Ctrl+Enter (Cmd+Enter) to save
          </span>
          <span>
            {content.length} characters
          </span>
        </div>
      </div>
    </div>
  );
} 