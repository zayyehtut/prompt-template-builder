import React, { useState } from 'react';
import { Template } from '../../../types/template';

interface RightPanelProps {
  template: Template | null;
  onTemplateUpdate: (template: Template) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  template,
  onTemplateUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'variables' | 'preview'>('properties');

  if (!template) {
    return (
      <div className="right-panel">
        <div className="right-panel-header">
          <h3>Properties</h3>
        </div>
        <div className="right-panel-content">
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <div className="empty-state-title">No Template Selected</div>
            <div className="empty-state-description">
              Select a template to view its properties
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDescriptionChange = (description: string) => {
    const updatedTemplate = { ...template, description, updatedAt: Date.now() };
    onTemplateUpdate(updatedTemplate);
  };

  const handleCategoryChange = (category: string) => {
    const updatedTemplate = { ...template, category, updatedAt: Date.now() };
    onTemplateUpdate(updatedTemplate);
  };

  const handleTagsChange = (tags: string[]) => {
    const updatedTemplate = { ...template, tags, updatedAt: Date.now() };
    onTemplateUpdate(updatedTemplate);
  };

  const handleFavoriteToggle = () => {
    const updatedTemplate = { ...template, favorite: !template.favorite, updatedAt: Date.now() };
    onTemplateUpdate(updatedTemplate);
  };

  const addTag = (tagName: string) => {
    if (tagName.trim() && !template.tags.includes(tagName.trim())) {
      handleTagsChange([...template.tags, tagName.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleTagsChange(template.tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="right-panel">
      <div className="right-panel-header">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'properties' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('properties')}
          >
            Properties
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'variables' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('variables')}
          >
            Variables
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
      </div>
      
      <div className="right-panel-content">
        {activeTab === 'properties' && (
          <div>
            <div className="property-section">
              <div className="property-section-title">Basic Info</div>
              
              <div className="property-field">
                <label className="property-label">Description</label>
                <textarea
                  className="property-input property-textarea"
                  value={template.description || ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Describe what this template is for..."
                />
              </div>
              
              <div className="property-field">
                <label className="property-label">Category</label>
                <input
                  type="text"
                  className="property-input"
                  value={template.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  placeholder="e.g., email, social, documentation"
                />
              </div>
              
              <div className="property-field">
                <label className="property-label">Favorite</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={template.favorite}
                    onChange={handleFavoriteToggle}
                  />
                  <span>Mark as favorite</span>
                </label>
              </div>
            </div>
            
            <div className="property-section">
              <div className="property-section-title">Tags</div>
              <div className="tags-container">
                {template.tags.map(tag => (
                  <div key={tag} className="tag">
                    {tag}
                    <button
                      className="tag-remove"
                      onClick={() => removeTag(tag)}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                className="property-input"
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            
            <div className="property-section">
              <div className="property-section-title">Statistics</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>Usage count: {template.usageCount}</div>
                <div>Created: {new Date(template.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(template.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'variables' && (
          <div>
            <div className="property-section">
              <div className="property-section-title">
                Variables ({template.variables.length})
              </div>
              {template.variables.length === 0 ? (
                                 <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                   No variables found.
                   <br />
                   Add {`{{VARIABLE_NAME}}`} in your template content.
                 </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {template.variables.map(variable => (
                    <div key={variable.name} style={{ 
                      padding: '12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-elevated)'
                    }}>
                      <div style={{ 
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                      }}>
                        {variable.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Type: {variable.type}
                        {variable.required && ' (required)'}
                      </div>
                      {variable.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {variable.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'preview' && (
          <div>
            <div className="property-section">
              <div className="property-section-title">Preview</div>
              <div style={{
                padding: '12px',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-elevated)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace'
              }}>
                {template.content || 'No content'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 