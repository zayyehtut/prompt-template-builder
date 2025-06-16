import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Template, Variable } from '@/types/template';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { chromeStorageAdapter } from '@/lib/zustand-storage';
import { interpolateTiptapContent, convertTiptapContentToText } from '@/lib/interpolation';
import { nanoid } from 'nanoid';

// 1. State and Actions Interface Definitions
interface TemplateState {
  templates: Template[];
  selectedTemplateId: string | null;
  variableValues: Record<string, any>;
  isLoading: boolean;
  isDirty: boolean;
  isCopied: boolean;
  searchQuery: string;
}

interface TemplateActions {
  loadTemplates: () => Promise<void>;
  selectTemplate: (id: string | null) => void;
  createNewTemplate: () => void;
  updateSelectedTemplate: (data: Partial<Omit<Template, 'id'>>) => void;
  saveSelectedTemplate: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setVariableValue: (name: string, value: any) => void;
  executeTemplate: () => Promise<void>;
  createFromContext: (content: string) => void;
  updateFromEditor: (content: string, variableNames: string[]) => void;
}

type TemplateStore = TemplateState & TemplateActions;

// 2. Store Implementation
export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // State
      templates: [],
      selectedTemplateId: null,
      variableValues: {},
      isLoading: true,
      isDirty: false,
      isCopied: false,
      searchQuery: '',

      // Actions
      loadTemplates: async () => {
        set({ isLoading: true });
        const templatesMap = await storage.getTemplates();
        const templates = Object.values(templatesMap);
        set({ templates, isLoading: false });
      },

      selectTemplate: (id) => {
        const { templates } = get();
        const template = templates.find(t => t.id === id) || null;
        set({ 
          selectedTemplateId: id, 
          isDirty: false,
          variableValues: template?.variables.reduce((acc, v) => ({ ...acc, [v.name]: v.defaultValue ?? '' }), {})
        });
      },

      createNewTemplate: () => {
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
        set(state => ({
          templates: [...state.templates, newTemplate],
          selectedTemplateId: newTemplate.id,
          isDirty: true
        }));
      },

      updateSelectedTemplate: (data) => {
        set(state => {
          const { selectedTemplateId, templates } = state;
          if (!selectedTemplateId) return {};
          const newTemplates = templates.map(t =>
            t.id === selectedTemplateId ? { ...t, ...data, updatedAt: Date.now() } : t
          );
          return { templates: newTemplates, isDirty: true };
        });
      },

      saveSelectedTemplate: async () => {
        const { selectedTemplateId, templates } = get();
        const templateToSave = templates.find(t => t.id === selectedTemplateId);
        if (templateToSave) {
          await storage.saveTemplate(templateToSave);
          set({ isDirty: false });
        }
      },

      deleteTemplate: async (id) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId
        }));
        await storage.deleteTemplate(id);
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setVariableValue: (name: string, value: any) => {
        set(state => ({
          variableValues: { ...state.variableValues, [name]: value }
        }));
      },

      executeTemplate: async () => {
        const { selectedTemplateId, templates, variableValues, isCopied } = get();
        const activeTemplate = templates.find(t => t.id === selectedTemplateId);

        if (!activeTemplate || isCopied) return;

        try {
          const interpolated = interpolateTiptapContent(activeTemplate.content, variableValues);
          const outputText = convertTiptapContentToText(interpolated);
          
          await navigator.clipboard.writeText(outputText);
          set({ isCopied: true });

          const updatedTemplate = { 
            ...activeTemplate, 
            usageCount: (activeTemplate.usageCount || 0) + 1,
            updatedAt: Date.now(),
          };
          await storage.saveTemplate(updatedTemplate);

          set(state => ({
            templates: state.templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
          }));
          
          await storage.addToHistory({
            id: nanoid(),
            templateId: activeTemplate.id,
            templateName: activeTemplate.name,
            variables: variableValues,
            output: outputText,
            executedAt: Date.now(),
          });
          
          setTimeout(() => {
            set({ isCopied: false });
            window.close();
          }, 700);

        } catch (error) {
          console.error('Failed to execute template:', error);
        }
      },
      
      createFromContext: (content) => {
        const newTemplate: Template = {
          id: generateId(),
          name: 'New from Selection',
          content: content,
          variables: [],
          category: 'general',
          description: '',
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
          favorite: false,
        };
        set(state => ({
          templates: [...state.templates, newTemplate],
          selectedTemplateId: newTemplate.id,
          isDirty: true,
        }));
      },
      
      updateFromEditor: (content, variableNames) => {
        set(state => {
          const { selectedTemplateId, templates } = state;
          const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
          if (!selectedTemplate) return {};
    
          const existingVariables = selectedTemplate.variables;
          const newVariables: Variable[] = variableNames.map(name => {
            return existingVariables.find(v => v.name === name) || 
                   { name, type: 'text' as const, required: true, defaultValue: '', description: '' };
          });
          
          const haveVariablesChanged = JSON.stringify(existingVariables) !== JSON.stringify(newVariables);
    
          if (selectedTemplate.content === content && !haveVariablesChanged) {
            return {};
          }
          
          const newTemplates = templates.map(t =>
            t.id === selectedTemplateId ? { 
                ...t, 
                content, 
                variables: newVariables,
                updatedAt: Date.now() 
            } : t
          );
          
          return { templates: newTemplates, isDirty: true };
        });
      },
    }),
    {
      name: 'prompt-template-store',
      storage: chromeStorageAdapter,
      partialize: (state) => ({
        selectedTemplateId: state.selectedTemplateId,
        searchQuery: state.searchQuery,
      }),
    }
  )
);

// Derived state selectors
export const useSelectedTemplate = () => {
  const store = useTemplateStore();
  return store.templates.find(t => t.id === store.selectedTemplateId) || null;
} 