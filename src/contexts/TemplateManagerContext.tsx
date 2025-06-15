import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Template } from '@/types/template';
import { generateId } from '@/lib/utils';

// 1. State and Action Defintions
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
  | { type: 'SELECT_TEMPLATE'; payload: { template: Template; isNew?: boolean } }
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
        isDirty: isNew ?? false,
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

// 2. Context Definition
interface TemplateManagerContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const TemplateManagerContext = createContext<TemplateManagerContextType | undefined>(undefined);


// 3. Provider Component
export const TemplateManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <TemplateManagerContext.Provider value={{ state, dispatch }}>
      {children}
    </TemplateManagerContext.Provider>
  );
};

// 4. Custom Hook for consuming the context
export const useTemplateManager = () => {
  const context = useContext(TemplateManagerContext);
  if (context === undefined) {
    throw new Error('useTemplateManager must be used within a TemplateManagerProvider');
  }
  return context;
}; 