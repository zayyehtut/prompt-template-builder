import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation } from './components/Layout/Navigation';
import { Sidebar } from './components/Layout/Sidebar';
import EditorArea from './components/Editor/EditorArea';
import { RightPanel } from './components/Layout/RightPanel';
import { Template } from '../types/template';
import { storage } from '../lib/storage';
import { useTheme } from '@/hooks/useTheme';

interface AppState {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  searchQuery: string;
}

const TemplateManager: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<Omit<AppState, 'theme'>>({
    templates: [],
    selectedTemplate: null,
    isLoading: true,
    searchQuery: '',
  });

  useEffect(() => {
    loadTemplates();
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
      name: 'New from Selection',
      content: text,
      variables: [],
      category: 'general',
      description: '',
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
      description: '',
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
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Navigation 
        theme={theme}
        onThemeToggle={toggleTheme}
        searchQuery={state.searchQuery}
        onSearch={handleSearch}
        onNewTemplate={handleTemplateCreate}
      />
      
      <div className="flex flex-1 pt-16">
        <Sidebar 
          templates={filteredTemplates}
          selectedTemplate={state.selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
          onTemplateCreate={handleTemplateCreate}
          onTemplateDelete={handleTemplateDelete}
          isLoading={state.isLoading}
        />
        
        <div className="flex-1 flex">
          <EditorArea 
            template={state.selectedTemplate}
            onTemplateUpdate={handleTemplateSave}
          />
          
          <RightPanel 
            template={state.selectedTemplate}
            onTemplateUpdate={handleTemplateSave}
          />
        </div>
      </div>
    </div>
  );
};

// Utility function to generate IDs
const generateId = (): string => {
  return `T${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
};

// Mount the app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TemplateManager />
    </React.StrictMode>
  );
} else {
  console.error('App container not found');
} 