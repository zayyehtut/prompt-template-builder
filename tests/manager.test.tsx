import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { TemplateManager } from '../src/pages/manager';
import { storage } from '../src/lib/storage';
import { Template } from '../src/types/template';

// --- MOCKS ---
global.chrome = {
  storage: { session: { get: vi.fn().mockResolvedValue({}) } },
  runtime: { openOptionsPage: vi.fn() },
} as any;

vi.mock('../src/lib/storage');

let editorAreaProps: any = {};
vi.mock('../src/pages/components/Editor/EditorArea', () => ({
    __esModule: true,
    default: (props: any) => {
        editorAreaProps = props;
        if (!props.template) {
            return <div>Mock Editor Area: Please select a template.</div>;
        }
        return <div>{props.template.content}</div>;
    }
}));

let rightPanelProps: any = {};
vi.mock('../src/pages/components/Layout/RightPanel', () => ({
    __esModule: true,
    RightPanel: (props: any) => {
        rightPanelProps = props;
        return <div data-testid="mock-right-panel" />;
    }
}));
// --- END MOCKS ---


const mockTemplates: Template[] = [
  { id: '1', name: 'Greeting', content: '<p>Hello, {{name}}!</p>', variables: [{ name: 'name', type: 'text', required: true }], createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0, favorite: false, tags:[], category: 'test' },
  { id: '2', name: 'Farewell', content: '<p>Goodbye, {{name}}.</p>', variables: [{ name: 'name', type: 'text', required: true }], createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0, favorite: false, tags: [], category: 'test' },
];

describe('Template Manager Page', () => {
  beforeEach(() => {
    (storage.getTemplates as Mock).mockResolvedValue([...mockTemplates]);
    (storage.getTheme as Mock).mockResolvedValue('dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the list of templates on initial load', async () => {
    render(<TemplateManager />);
    await waitFor(() => {
      expect(screen.getByText('Greeting')).toBeInTheDocument();
      expect(screen.getByText('Farewell')).toBeInTheDocument();
    });
    expect(await screen.findByText(/Mock Editor Area/i)).toBeInTheDocument();
  });

  it('should display template content when a template is selected', async () => {
    render(<TemplateManager />);
    const greetingTemplateItem = await screen.findByText('Greeting');
    fireEvent.click(greetingTemplateItem);

    await waitFor(() => {
      expect(screen.getByText('<p>Hello, {{name}}!</p>')).toBeInTheDocument();
    });
  });

  it('should update the variable list when editor content changes', async () => {
    render(<TemplateManager />);
    const greetingTemplateItem = await screen.findByText('Greeting');
    fireEvent.click(greetingTemplateItem);

    // Initial check
    await waitFor(() => {
        expect(rightPanelProps.template.variables).toHaveLength(1);
        expect(rightPanelProps.template.variables[0].name).toBe('name');
    });
    
    // Simulate update
    act(() => {
        editorAreaProps.onContentChange('<p>Hello, {{name}}! Welcome, {{guest}}.</p>');
        editorAreaProps.onVariablesExtract(['name', 'guest']);
    });

    // Final check on the captured prop
    await waitFor(() => {
        expect(rightPanelProps.template.variables).toHaveLength(2);
        const guestVar = rightPanelProps.template.variables.find((v: any) => v.name === 'guest');
        expect(guestVar).toBeDefined();
    });
  });
}); 