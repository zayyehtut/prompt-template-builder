import React, { useState, useEffect, useCallback } from 'react';
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

export const TemplateManager: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<Omit<AppState, 'theme'>>({
    templates: [],
    selectedTemplate: null,
    isLoading: true,
    searchQuery: '',
  });
  const [activeVariables, setActiveVariables] = useState<Template['variables']>([]);
  const [isDirty, setIsDirty] = useState(false);

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
          const newTemplate = createTemplateFromText(managerContext.selectedText);
          handleTemplateSelect(newTemplate, true);
        }
        // Clear context after use
        chrome.storage.session.remove('managerContext');
      }
    } catch (error) {
      console.error('Failed to check context:', error);
    }
  };

  const createTemplateFromText = (text: string): Template => {
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
    
    return newTemplate;
  };

  const handleTemplateSelect = (template: Template, isNew = false) => {
    setState(prev => ({ 
      ...prev, 
      selectedTemplate: template,
      templates: isNew ? [...prev.templates, template] : prev.templates
    }));
    setActiveVariables(template.variables);
    setIsDirty(false);
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
    handleTemplateSelect(newTemplate, true);
    setIsDirty(true);
  };

  const handleTemplateSave = useCallback(async () => {
    if (!state.selectedTemplate || !isDirty) return;
    
    try {
      const templateToSave: Template = {
        ...state.selectedTemplate,
        variables: activeVariables,
        updatedAt: Date.now(),
      };
      
      await storage.saveTemplate(templateToSave);
      
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(t =>
          t.id === templateToSave.id ? templateToSave : t
        ),
        selectedTemplate: templateToSave,
      }));
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [state.selectedTemplate, activeVariables, isDirty]);

  const handleContentChange = (content: string) => {
    if (state.selectedTemplate && state.selectedTemplate.content !== content) {
      setState(prev => ({
        ...prev,
        selectedTemplate: { ...prev.selectedTemplate!, content }
      }));
      setIsDirty(true);
    }
  };

  const handleNameChange = (name: string) => {
    if (state.selectedTemplate && state.selectedTemplate.name !== name) {
      setState(prev => ({
        ...prev,
        selectedTemplate: { ...prev.selectedTemplate!, name }
      }));
      setIsDirty(true);
    }
  };

  const handleVariablesExtract = (variableNames: string[]) => {
    const newVariables = variableNames.map(name => {
      const existing = activeVariables.find(v => v.name === name);
      return existing || { name, type: 'text' as const, required: true, description: '' };
    });
    // Only update if the variable list has actually changed
    if (JSON.stringify(newVariables) !== JSON.stringify(activeVariables)) {
      setActiveVariables(newVariables);
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

  const handleTemplateUpdate = (updates: Partial<Template>) => {
    if (state.selectedTemplate) {
      const updatedTemplate = { ...state.selectedTemplate, ...updates };
      setState(prev => ({
        ...prev,
        selectedTemplate: updatedTemplate
      }));
      setIsDirty(true);
    }
  };

  const updatedRightPanelTemplate = state.selectedTemplate ? {
    ...state.selectedTemplate,
    variables: activeVariables,
  } : null;

  if (!theme) {
    return null; // or a loading spinner
  }

  return (
    <div className={`flex flex-col h-screen bg-background text-foreground ${theme}`}>
      <Navigation 
        theme={theme}
        onThemeToggle={toggleTheme}
        searchQuery={state.searchQuery}
        onSearch={handleSearch}
        onNewTemplate={handleTemplateCreate}
        onSave={handleTemplateSave}
        isSaveDisabled={!isDirty}
      />
      
      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar
          templates={filteredTemplates}
          selectedTemplate={state.selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
          onTemplateCreate={handleTemplateCreate}
          onTemplateDelete={handleTemplateDelete}
          isLoading={state.isLoading}
        />
        
        <main className="flex-1 flex flex-col p-4">
          <div className="flex-1 flex flex-col w-full h-full border rounded-lg overflow-hidden">
            <EditorArea
              key={state.selectedTemplate?.id}
              template={state.selectedTemplate}
              onContentChange={handleContentChange}
              onNameChange={handleNameChange}
              onVariablesExtract={handleVariablesExtract}
              onSave={handleTemplateSave}
            />
          </div>
        </main>
        
        <RightPanel 
          template={updatedRightPanelTemplate}
          onTemplateUpdate={handleTemplateUpdate}
        />
      </div>
    </div>
  );
};

// Utility function to generate IDs
const generateId = (): string => {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}; 