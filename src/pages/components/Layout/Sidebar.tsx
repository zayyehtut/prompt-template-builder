import React from 'react';
import { Template } from '../../../types/template';

interface SidebarProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onTemplateCreate: () => void;
  onTemplateDelete: (templateId: string) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateDelete,
  isLoading,
}) => {
  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categories = Object.keys(templatesByCategory).sort();

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template);
  };

  const handleDeleteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      onTemplateDelete(templateId);
    }
  };

  if (isLoading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Templates</h2>
        </div>
        <div className="sidebar-content">
          <div className="loading">
            <div className="spinner"></div>
            Loading templates...
          </div>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Templates</h2>
        </div>
        <div className="sidebar-content">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No Templates</div>
            <div className="empty-state-description">
              Create your first template to get started
            </div>
            <button className="btn btn-primary" onClick={onTemplateCreate}>
              Create Template
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Templates ({templates.length})</h2>
      </div>
      <div className="sidebar-content">
        {categories.map(category => (
          <div key={category} className="category-section">
            <div className="category-header">
              <div className="category-title">{category}</div>
              <div className="category-count">
                {templatesByCategory[category].length}
              </div>
            </div>
            <div className="template-list">
              {templatesByCategory[category].map(template => (
                <div
                  key={template.id}
                  className={`template-item ${
                    selectedTemplate?.id === template.id ? 'selected' : ''
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="template-name">
                    {template.name}
                    {template.favorite && <span style={{ marginLeft: '6px' }}>⭐</span>}
                  </div>
                  {template.description && (
                    <div className="template-description">
                      {template.description}
                    </div>
                  )}
                  <div className="template-meta">
                    <div className="template-variables">
                      {template.variables.length > 0 && (
                        <span className="variable-count">
                          {template.variables.length} var{template.variables.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="icon-btn"
                        onClick={(e) => handleDeleteClick(e, template.id)}
                        title="Delete template"
                        style={{ width: '20px', height: '20px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 