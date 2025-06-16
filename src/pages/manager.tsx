import React, { useEffect } from 'react';
import { Navigation } from './components/Layout/Navigation';
import { Sidebar } from './components/Layout/Sidebar';
import EditorArea from './components/Editor/EditorArea';
import { RightPanel } from './components/Layout/RightPanel';
import { useTheme } from '@/hooks/useTheme';
import { useTemplateStore, useSelectedTemplate } from '@/stores/templateStore';

export const TemplateManager: React.FC = () => {
  const { theme } = useTheme();
  
  // Get state and actions from the Zustand store
  const { 
    templates, 
    searchQuery, 
    isDirty,
    loadTemplates, 
    createFromContext,
    saveSelectedTemplate,
  } = useTemplateStore();

  const selectedTemplate = useSelectedTemplate();

  useEffect(() => {
    loadTemplates();
    checkForContext();
  }, [loadTemplates]);

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

  // Auto-save templates after a delay
  useEffect(() => {
    if (!isDirty || !selectedTemplate) return;

    const handler = setTimeout(() => {
      saveSelectedTemplate();
    }, 1000); // 1-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [selectedTemplate, isDirty, saveSelectedTemplate]);

  const filteredTemplates = templates.filter(template => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (typeof template.content === 'string' && template.content.toLowerCase().includes(query)) ||
      template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });
  
  if (!theme) {
    return null;
  }

  return (
    <div className={`flex flex-col h-screen bg-background text-foreground ${theme}`}>
      <Navigation />

      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar
          templates={filteredTemplates}
        />

        <main className="flex-1 flex flex-col p-4">
          <div className="flex-1 flex flex-col w-full h-full border rounded-lg overflow-hidden">
            <EditorArea />
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  );
}; 