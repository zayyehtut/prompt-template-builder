import { useState, useEffect } from 'react';
import { TemplateList } from './components/TemplateList';
import { QuickEditor } from './components/QuickEditor';
import { VariableForm } from './components/VariableForm';
import { storage } from '@/lib/storage';
import { interpolateTemplate } from '@/lib/interpolation';
import type { Template } from '@/types/storage';
import { nanoid } from 'nanoid';

type AppMode = 'list' | 'edit' | 'execute';

function App() {
  const [mode, setMode] = useState<AppMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await storage.getTemplates();
      setTemplates(Object.values(allTemplates));
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (template: Template, variables: Record<string, unknown>) => {
    try {
      const output = interpolateTemplate(template.content, variables);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(output);
      
      // Save to history
      await storage.addToHistory({
        id: nanoid(),
        templateId: template.id,
        templateName: template.name,
        variables,
        output,
        executedAt: Date.now(),
        context: await getCurrentContext(),
      });
      
      // Update usage count
      const updatedTemplate = { ...template, usageCount: (template.usageCount || 0) + 1 };
      await storage.saveTemplate(updatedTemplate);
      
      // Refresh templates
      await loadTemplates();
      
      // Show success feedback
      showNotification('Template copied to clipboard!');
      
      // Close popup if autoClose is enabled
      const settings = await storage.getSettings();
      if (settings?.autoClose) {
        window.close();
      } else {
        // Go back to list
        setMode('list');
      }
    } catch (error) {
      console.error('Failed to execute template:', error);
      showNotification('Failed to execute template', 'error');
    }
  };

  const handleSaveTemplate = async (template: Template) => {
    try {
      await storage.saveTemplate(template);
      await loadTemplates();
      setMode('list');
      showNotification(selectedTemplate ? 'Template updated!' : 'Template created!');
    } catch (error) {
      console.error('Failed to save template:', error);
      showNotification('Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    try {
      await storage.deleteTemplate(template.id);
      await loadTemplates();
      showNotification('Template deleted');
    } catch (error) {
      console.error('Failed to delete template:', error);
      showNotification('Failed to delete template', 'error');
    }
  };

  const handleToggleFavorite = async (template: Template) => {
    try {
      const updatedTemplate = { ...template, favorite: !template.favorite };
      await storage.saveTemplate(updatedTemplate);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showNotification('Failed to update favorite', 'error');
    }
  };

  const getCurrentContext = async () => {
    try {
      // Try to get context from session storage (set by background script)
      const result = await chrome.storage.session.get('popupContext');
      return result.popupContext || {};
    } catch {
      return {};
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple notification - could be enhanced with a toast component
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  if (loading) {
    return (
      <div className="w-[400px] h-[600px] flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[600px] bg-white dark:bg-gray-900">
      {mode === 'list' && (
        <TemplateList
          templates={templates}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={(template) => {
            setSelectedTemplate(template);
            setMode('execute');
          }}
          onEdit={(template) => {
            setSelectedTemplate(template);
            setMode('edit');
          }}
          onNew={() => {
            setSelectedTemplate(null);
            setMode('edit');
          }}
          onDelete={handleDeleteTemplate}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
      
      {mode === 'edit' && (
        <QuickEditor
          template={selectedTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setMode('list')}
        />
      )}
      
      {mode === 'execute' && selectedTemplate && (
        <VariableForm
          template={selectedTemplate}
          onSubmit={(variables) => handleExecute(selectedTemplate, variables)}
          onBack={() => setMode('list')}
        />
      )}
    </div>
  );
}

export default App; 