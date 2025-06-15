import { useCallback } from 'react';
import { useTemplateManager } from '@/contexts/TemplateManagerContext';
import { Template } from '@/types/template';

/**
 * A custom hook that provides a collection of stable, memoized functions 
 * for dispatching actions to the template manager. This abstracts away the
 * `dispatch` logic from components, making them cleaner and more focused.
 *
 * @returns An object containing various action functions.
 */
export const useTemplateActions = () => {
  const { dispatch } = useTemplateManager();

  const startLoading = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
  }, [dispatch]);

  const setTemplates = useCallback((templates: Template[]) => {
    dispatch({ type: 'SET_TEMPLATES', payload: templates });
  }, [dispatch]);

  const selectTemplate = useCallback((template: Template, isNew = false) => {
    dispatch({ type: 'SELECT_TEMPLATE', payload: { template, isNew } });
  }, [dispatch]);

  const createNewTemplate = useCallback(() => {
    dispatch({ type: 'CREATE_NEW_TEMPLATE' });
  }, [dispatch]);

  const updateSelectedTemplate = useCallback((updates: Partial<Template>) => {
    dispatch({ type: 'UPDATE_SELECTED_TEMPLATE', payload: updates });
  }, [dispatch]);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, [dispatch]);

  const deleteTemplate = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
  }, [dispatch]);

  const saveTemplateSuccess = useCallback((template: Template) => {
    dispatch({ type: 'SAVE_TEMPLATE_SUCCESS', payload: template });
  }, [dispatch]);

  const extractVariables = useCallback((variables: string[]) => {
    dispatch({ type: 'EXTRACT_VARIABLES', payload: variables });
  }, [dispatch]);

  const createFromContext = useCallback((content: string) => {
    dispatch({ type: 'CREATE_FROM_CONTEXT', payload: content });
  }, [dispatch]);

  return {
    startLoading,
    setTemplates,
    selectTemplate,
    createNewTemplate,
    updateSelectedTemplate,
    setSearchQuery,
    deleteTemplate,
    saveTemplateSuccess,
    extractVariables,
    createFromContext,
  };
}; 