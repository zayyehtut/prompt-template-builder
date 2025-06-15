import React, { useEffect, useCallback, useReducer } from 'react';
import { Navigation } from './components/Layout/Navigation';
import { Sidebar } from './components/Layout/Sidebar';
import EditorArea from './components/Editor/EditorArea';
import { RightPanel } from './components/Layout/RightPanel';
import { Template } from '../types/template';
import { storage } from '../lib/storage';
import { useTheme } from '@/hooks/useTheme';
import { generateId } from '@/lib/utils';

interface AppState {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  searchQuery: string;
  isDirty: boolean;
}

type Action =
  | { type: 'START_LOADING' }
  | { type: 'SET_TEMPLATES'; payload: Template[] }
  | { type: 'SELECT_TEMPLATE'; payload: { template: Template, isNew?: boolean } }
  | { type: 'CREATE_NEW_TEMPLATE' }
  | { type: 'UPDATE_SELECTED_TEMPLATE'; payload: Partial<Template> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'SAVE_TEMPLATE_SUCCESS'; payload: Template }
  | { type: 'EXTRACT_VARIABLES'; payload: string[] }
  | { type: 'CREATE_FROM_CONTEXT'; payload: string };

const initialState: AppState = {
  templates: [],
  selectedTemplate: null,
  isLoading: true,
  searchQuery: '',
  isDirty: false,
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload, isLoading: false };
    case 'SELECT_TEMPLATE': {
      const { template, isNew } = action.payload;
      return {
        ...state,
        selectedTemplate: template,
        templates: isNew ? [...state.templates, template] : state.templates,
        isDirty: !!isNew,
      };
    }
    case 'CREATE_NEW_TEMPLATE': {
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
      return {
        ...state,
        selectedTemplate: newTemplate,
        templates: [...state.templates, newTemplate],
        isDirty: true,
      };
    }
    case 'UPDATE_SELECTED_TEMPLATE':
      if (!state.selectedTemplate) return state;
      return {
        ...state,
        selectedTemplate: { ...state.selectedTemplate, ...action.payload },
        isDirty: true,
      };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'DELETE_TEMPLATE': {
      const newTemplates = state.templates.filter(t => t.id !== action.payload);
      return {
        ...state,
        templates: newTemplates,
        selectedTemplate: state.selectedTemplate?.id === action.payload ? null : state.selectedTemplate,
      };
    }
    case 'SAVE_TEMPLATE_SUCCESS': {
      const updatedTemplate = action.payload;
      const newTemplates = state.templates.map(t =>
        t.id === updatedTemplate.id ? updatedTemplate : t
      );
      return {
        ...state,
        templates: newTemplates,
        selectedTemplate: updatedTemplate,
        isDirty: false,
      };
    }
    case 'EXTRACT_VARIABLES': {
      if (!state.selectedTemplate) return state;
      const newVariables = action.payload.map(name => {
        const existing = state.selectedTemplate!.variables.find(v => v.name === name);
        return existing || { name, type: 'text' as const, required: true, description: '' };
      });

      if (JSON.stringify(newVariables) === JSON.stringify(state.selectedTemplate.variables)) {
        return state;
      }
      
      return {
        ...state,
        selectedTemplate: { ...state.selectedTemplate, variables: newVariables },
        isDirty: true,
      };
    }
    case 'CREATE_FROM_CONTEXT': {
        const newTemplate: Template = {
            id: generateId(),
            name: 'New from Selection',
            content: action.payload,
            variables: [],
            category: 'general',
            description: '',
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0,
            favorite: false,
        };
        return {
            ...state,
            selectedTemplate: newTemplate,
            templates: [...state.templates, newTemplate],
            isDirty: true,
        };
    }
    default:
      return state;
  }
};

export const TemplateManager: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadTemplates();
    checkForContext();
  }, []);

  const loadTemplates = async () => {
    dispatch({ type: 'START_LOADING' });
    try {
      const templatesData = await storage.getTemplates();
      dispatch({ type: 'SET_TEMPLATES', payload: Object.values(templatesData) });
    } catch (error) {
      console.error('Failed to load templates:', error);
      dispatch({ type: 'SET_TEMPLATES', payload: [] });
    }
  };

  const checkForContext = async () => {
    try {
      const { managerContext } = await chrome.storage.session.get('managerContext');
      if (managerContext?.action === 'new-template' && managerContext.selectedText) {
        dispatch({ type: 'CREATE_FROM_CONTEXT', payload: managerContext.selectedText });
        chrome.storage.session.remove('managerContext');
      }
    } catch (error) {
      console.error('Failed to check context:', error);
    }
  };

  const handleTemplateSelect = (template: Template, isNew = false) => {
    dispatch({ type: 'SELECT_TEMPLATE', payload: { template, isNew } });
  };
  
  const handleTemplateCreate = () => dispatch({ type: 'CREATE_NEW_TEMPLATE' });

  const handleTemplateSave = useCallback(async () => {
    if (!state.selectedTemplate || !state.isDirty) return;
    
    try {
      const templateToSave = {
        ...state.selectedTemplate,
        updatedAt: Date.now(),
      };
      
      await storage.saveTemplate(templateToSave);
      dispatch({ type: 'SAVE_TEMPLATE_SUCCESS', payload: templateToSave });
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [state.selectedTemplate, state.isDirty]);

  const handleContentChange = (content: string) => {
    if (state.selectedTemplate?.content !== content) {
      dispatch({ type: 'UPDATE_SELECTED_TEMPLATE', payload: { content }});
    }
  };

  const handleNameChange = (name: string) => {
    if (state.selectedTemplate?.name !== name) {
        dispatch({ type: 'UPDATE_SELECTED_TEMPLATE', payload: { name }});
    }
  };

  const handleVariablesExtract = (variableNames: string[]) => {
    dispatch({ type: 'EXTRACT_VARIABLES', payload: variableNames });
  };

  const handleTemplateDelete = async (templateId: string) => {
    try {
      await storage.deleteTemplate(templateId);
      dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSearch = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
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
    dispatch({ type: 'UPDATE_SELECTED_TEMPLATE', payload: updates });
  };

  if (!theme) {
    return null; 
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
        isSaveDisabled={!state.isDirty}
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
          template={state.selectedTemplate}
          onTemplateUpdate={handleTemplateUpdate}
        />
      </div>
    </div>
  );
}; 