import React, { useState, useEffect } from 'react';
import { Template } from '../../../types/template';
import { parseTemplate } from '../../../lib/template-parser';

interface EditorAreaProps {
  template: Template | null;
  onTemplateSave: (template: Template) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  template,
  onTemplateSave,
}) => {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when template changes
  useEffect(() => {
    if (template) {
      setContent(template.content);
      setName(template.name);
      setHasChanges(false);
    } else {
      setContent('');
      setName('');
      setHasChanges(false);
    }
  }, [template]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!template) return;

    // Parse the template to extract variables
    const { variables } = parseTemplate(content);

    const updatedTemplate: Template = {
      ...template,
      name: name.trim() || 'Untitled Template',
      content,
      variables,
      updatedAt: Date.now(),
    };

    onTemplateSave(updatedTemplate);
    setHasChanges(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save with Cmd+S or Ctrl+S
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!template) {
    return (
      <div className="editor-area">
        <div className="empty-state">
          <div className="empty-state-icon">✨</div>
          <div className="empty-state-title">No Template Selected</div>
          <div className="empty-state-description">
            Select a template from the sidebar or create a new one to start editing
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <div className="editor-toolbar">
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Template name..."
          className="property-input"
          style={{ 
            flex: 1, 
            marginRight: '12px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        />
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Unsaved changes
            </span>
          )}
          
          <button
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleSave}
            disabled={!hasChanges}
            title="Save template (Cmd+S)"
          >
            💾 Save
          </button>
        </div>
      </div>
      
      <div className="editor-container">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing your template content here...

Use {{VARIABLE_NAME}} to create variables in your template.

Example:
Hello {{NAME}}, 

I hope this email finds you well. I wanted to reach out about {{TOPIC}}.

Best regards,
{{SENDER_NAME}}"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '20px',
            fontSize: '14px',
            fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
            lineHeight: '1.6',
            backgroundColor: 'var(--editor-bg)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  );
}; 