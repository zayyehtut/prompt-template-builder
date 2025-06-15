import React, { useEffect, useCallback } from 'react';
import { Navigation } from './components/Layout/Navigation';
import { Sidebar } from './components/Layout/Sidebar';
import EditorArea from './components/Editor/EditorArea';
import { RightPanel } from './components/Layout/RightPanel';
import { storage } from '../lib/storage';
import { useTheme } from '@/hooks/useTheme';
import { TemplateManagerProvider, useTemplateManager } from '@/contexts/TemplateManagerContext';
import { useTemplateActions } from '@/hooks/useTemplateActions';

const TemplateManagerContent: React.FC = () => {
  const { theme } = useTheme();
  const { state } = useTemplateManager();
  const {
    startLoading,
    setTemplates,
    createFromContext,
    saveTemplateSuccess,
    deleteTemplate,
  } = useTemplateActions();

  useEffect(() => {
    loadTemplates();
    checkForContext();
  }, []);

  const loadTemplates = async () => {
    startLoading();
    try {
      const templatesData = await storage.getTemplates();
      setTemplates(Object.values(templatesData));
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  };

  const checkForContext = async () => {
    try {
      const { managerContext } = await chrome.storage.session.get('managerContext');
      if (managerContext?.action === 'new-template' && managerContext.selectedText) {
        createFromContext(managerContext.selectedText);
        chrome.storage.session.remove('managerContext');
      }
    } catch (error) {
      console.error('Failed to check context:', error);
    }
  };

  const handleTemplateSave = useCallback(async () => {
    if (!state.selectedTemplate || !state.isDirty) return;

    try {
      const templateToSave = {
        ...state.selectedTemplate,
        updatedAt: Date.now(),
      };

      await storage.saveTemplate(templateToSave);
      saveTemplateSuccess(templateToSave);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [state.selectedTemplate, state.isDirty, saveTemplateSuccess]);

  // Auto-save templates after a delay
  useEffect(() => {
    if (!state.isDirty || !state.selectedTemplate) return;

    const handler = setTimeout(() => {
      handleTemplateSave();
    }, 1000); // 1-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [state.selectedTemplate, state.isDirty, handleTemplateSave]);

  const handleTemplateDelete = async (templateId: string) => {
    try {
      await storage.deleteTemplate(templateId);
      deleteTemplate(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
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
  
  if (!theme) {
    return null;
  }

  return (
    <div className={`flex flex-col h-screen bg-background text-foreground ${theme}`}>
      <Navigation onSave={handleTemplateSave} />

      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar
          templates={filteredTemplates}
          onTemplateDelete={handleTemplateDelete}
        />

        <main className="flex-1 flex flex-col p-4">
          <div className="flex-1 flex flex-col w-full h-full border rounded-lg overflow-hidden">
            <EditorArea onSave={handleTemplateSave} />
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  );
};


export const TemplateManager: React.FC = () => {
  return (
    <TemplateManagerProvider>
      <TemplateManagerContent />
    </TemplateManagerProvider>
  );
}; 