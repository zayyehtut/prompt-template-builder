// React is imported automatically by Vite
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateList } from '../src/popup/components/TemplateList';
import { QuickEditor } from '../src/popup/components/QuickEditor';
import { VariableForm } from '../src/popup/components/VariableForm';
import type { Template } from '../src/types/storage';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123'
}));

describe('Popup Components', () => {
  const mockTemplate: Template = {
    id: '1',
    name: 'Test Template',
    content: 'Hello {{NAME}}, welcome to {{PLACE}}!',
    variables: [
      { name: 'NAME', type: 'text', required: true },
      { name: 'PLACE', type: 'text', required: true }
    ],
    category: 'greeting',
    tags: ['test', 'greeting'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 5,
    favorite: false
  };

  describe('TemplateList', () => {
    const defaultProps = {
      templates: [mockTemplate],
      searchQuery: '',
      onSearch: vi.fn(),
      onSelect: vi.fn(),
      onEdit: vi.fn(),
      onNew: vi.fn(),
      onDelete: vi.fn(),
      onToggleFavorite: vi.fn()
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render template list', () => {
      render(<TemplateList {...defaultProps} />);
      
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(screen.getByText('Hello {{NAME}}, welcome to {{PLACE}}!')).toBeInTheDocument();
    });

    it('should handle search input', () => {
      render(<TemplateList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test');
    });

    it('should handle new template button', () => {
      render(<TemplateList {...defaultProps} />);
      
      const newButton = screen.getByText('+ New');
      fireEvent.click(newButton);
      
      expect(defaultProps.onNew).toHaveBeenCalled();
    });

    it('should show empty state when no templates', () => {
      render(<TemplateList {...defaultProps} templates={[]} />);
      
      expect(screen.getByText('No templates yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first template')).toBeInTheDocument();
    });

    it('should filter templates by search query', () => {
      const templates = [
        mockTemplate,
        {
          ...mockTemplate,
          id: '2',
          name: 'Another Template',
          content: 'Different content',
          tags: ['other']
        }
      ];

      render(<TemplateList {...defaultProps} templates={templates} searchQuery="test" />);
      
      // Should show only the template with "test" in name
      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(screen.queryByText('Another Template')).not.toBeInTheDocument();
    });
  });

  describe('QuickEditor', () => {
    const defaultProps = {
      onSave: vi.fn(),
      onCancel: vi.fn()
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render new template form', () => {
      render(<QuickEditor {...defaultProps} />);
      
      expect(screen.getByText('New Template')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter template name...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your template content/)).toBeInTheDocument();
    });

    it('should render edit template form', () => {
      render(<QuickEditor {...defaultProps} template={mockTemplate} />);
      
      expect(screen.getByText('Edit Template')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hello {{NAME}}, welcome to {{PLACE}}!')).toBeInTheDocument();
    });

    it('should detect variables in content', () => {
      render(<QuickEditor {...defaultProps} />);
      
      const contentTextarea = screen.getByPlaceholderText(/Enter your template content/);
      fireEvent.change(contentTextarea, { 
        target: { value: 'Hello {{NAME}}, you have {{COUNT:number}} messages' } 
      });
      
      expect(screen.getByText('2 variables detected')).toBeInTheDocument();
    });

    it('should handle save with validation', async () => {
      render(<QuickEditor {...defaultProps} />);
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      // Should show validation errors immediately (no need for waitFor since it's synchronous)
      expect(screen.getByText('Template name is required')).toBeInTheDocument();
      expect(screen.getByText('Template content is required')).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should handle cancel', () => {
      render(<QuickEditor {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('VariableForm', () => {
    const defaultProps = {
      template: mockTemplate,
      onSubmit: vi.fn(),
      onBack: vi.fn()
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render variable form', () => {
      render(<VariableForm {...defaultProps} />);
      
      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(screen.getByText('2 variables to fill')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter place...')).toBeInTheDocument();
    });

    it('should handle variable input', () => {
      render(<VariableForm {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText('Enter name...');
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      expect(nameInput).toHaveValue('John');
    });

    it('should show preview when enabled', () => {
      render(<VariableForm {...defaultProps} />);
      
      // Fill in variables
      fireEvent.change(screen.getByPlaceholderText('Enter name...'), { target: { value: 'John' } });
      fireEvent.change(screen.getByPlaceholderText('Enter place...'), { target: { value: 'New York' } });
      
      // Show preview
      const previewButton = screen.getByText('Show Preview');
      fireEvent.click(previewButton);
      
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Hello John, welcome to New York!')).toBeInTheDocument();
    });

    it('should handle form submission', () => {
      render(<VariableForm {...defaultProps} />);
      
      // Fill in variables
      fireEvent.change(screen.getByPlaceholderText('Enter name...'), { target: { value: 'John' } });
      fireEvent.change(screen.getByPlaceholderText('Enter place...'), { target: { value: 'New York' } });
      
      // Submit form
      const submitButton = screen.getByText('Use Template');
      fireEvent.click(submitButton);
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        NAME: 'John',
        PLACE: 'New York'
      });
    });

    it('should validate required fields', () => {
      render(<VariableForm {...defaultProps} />);
      
      // Try to submit without filling required fields
      const submitButton = screen.getByText('Use Template');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('NAME is required')).toBeInTheDocument();
      expect(screen.getByText('PLACE is required')).toBeInTheDocument();
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should handle back navigation', () => {
      render(<VariableForm {...defaultProps} />);
      
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('should handle templates with no variables', () => {
      const templateWithNoVars = {
        ...mockTemplate,
        variables: [],
        content: 'Static template content'
      };

      render(<VariableForm {...defaultProps} template={templateWithNoVars} />);
      
      expect(screen.getByText('This template has no variables')).toBeInTheDocument();
      
      const useButtons = screen.getAllByText('Use Template');
      const useButton = useButtons.find(button => button.className.includes('px-4 py-2'));
      fireEvent.click(useButton!);
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({});
    });
  });
}); 