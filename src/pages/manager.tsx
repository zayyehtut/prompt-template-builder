import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation } from './components/Layout/Navigation';
import { Sidebar } from './components/Layout/Sidebar';
import { EditorArea } from './components/Editor/EditorArea';
import { RightPanel } from './components/Layout/RightPanel';
import { Template } from '../types/template';
import { storage } from '../lib/storage';

interface AppState {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  searchQuery: string;
}

const TemplateManager: React.FC = () => {
  const [state, setState] = useState<AppState>({
    templates: [],
    selectedTemplate: null,
    isLoading: true,
    theme: 'dark',
    searchQuery: '',
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    loadTheme();
    checkForContext();
  }, []);

  const loadTemplates = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const templatesData = await storage.getTemplates();
      const templates = Object.values(templatesData);
      setState(prev => ({ 
        ...prev, 
        templates,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to load templates:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadTheme = async () => {
    try {
      const { settings } = await chrome.storage.sync.get('settings');
      const theme = settings?.theme || 'dark';
      setState(prev => ({ ...prev, theme }));
      document.body.setAttribute('data-theme', theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const checkForContext = async () => {
    try {
      // Check if we were opened with context (e.g., from popup)
      const { managerContext } = await chrome.storage.session.get('managerContext');
      if (managerContext) {
        // Handle context (e.g., create new template with selected text)
        if (managerContext.action === 'new-template' && managerContext.selectedText) {
          createTemplateFromText(managerContext.selectedText);
        }
        // Clear context after use
        chrome.storage.session.remove('managerContext');
      }
    } catch (error) {
      console.error('Failed to check context:', error);
    }
  };

  const createTemplateFromText = (text: string) => {
    const newTemplate: Template = {
      id: generateId(),
      name: 'New Template',
      content: text,
      variables: [],
      category: 'general',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      favorite: false,
    };
    
    setState(prev => ({
      ...prev,
      selectedTemplate: newTemplate,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const handleTemplateSelect = (template: Template) => {
    setState(prev => ({ ...prev, selectedTemplate: template }));
  };

  const handleTemplateCreate = () => {
    const newTemplate: Template = {
      id: generateId(),
      name: 'Untitled Template',
      content: '',
      variables: [],
      category: 'general',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      favorite: false,
    };
    
    setState(prev => ({
      ...prev,
      selectedTemplate: newTemplate,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const handleTemplateSave = async (template: Template) => {
    try {
      await storage.saveTemplate(template);
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(t => 
          t.id === template.id ? template : t
        )
      }));
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleTemplateDelete = async (templateId: string) => {
    try {
      await storage.deleteTemplate(templateId);
      setState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => t.id !== templateId),
        selectedTemplate: prev.selectedTemplate?.id === templateId 
          ? null 
          : prev.selectedTemplate
      }));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setState(prev => ({ ...prev, theme: newTheme }));
    document.body.setAttribute('data-theme', newTheme);
    
    try {
      const { settings = {} } = await chrome.storage.sync.get('settings');
      await chrome.storage.sync.set({
        settings: { ...settings, theme: newTheme }
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const handleSearch = (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  };

  const filteredTemplates = state.templates.filter(template => {
    if (!state.searchQuery) return true;
    const query = state.searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query) ||
      template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="app-container">
      <Navigation 
        theme={state.theme}
        onThemeToggle={handleThemeToggle}
        searchQuery={state.searchQuery}
        onSearch={handleSearch}
        onNewTemplate={handleTemplateCreate}
      />
      
      <div className="main-content">
        <Sidebar 
          templates={filteredTemplates}
          selectedTemplate={state.selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
          onTemplateCreate={handleTemplateCreate}
          onTemplateDelete={handleTemplateDelete}
          isLoading={state.isLoading}
        />
        
        <EditorArea 
          template={state.selectedTemplate}
          onTemplateSave={handleTemplateSave}
        />
        
        <RightPanel 
          template={state.selectedTemplate}
          onTemplateUpdate={handleTemplateSave}
        />
      </div>
    </div>
  );
};

// Utility function to generate IDs
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Mount the app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<TemplateManager />);
} else {
  console.error('App container not found');
} 