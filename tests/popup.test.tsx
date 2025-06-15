import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import Popup from '../src/popup/App';
import { storage } from '../src/lib/storage';
import { Template } from '../src/types/template';

// Mock the storage module
vi.mock('../src/lib/storage', () => ({
  storage: {
    getTemplates: vi.fn(),
    saveTemplate: vi.fn(),
    addToHistory: vi.fn(),
    openManager: vi.fn(),
    getTheme: vi.fn().mockResolvedValue('dark'),
    setTheme: vi.fn(),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockTemplates: Record<string, Template> = {
  '1': {
    id: '1',
    name: 'Test Email Template',
    content: 'Hello, {{name}}! Welcome to {{product}}.',
    variables: [
      { name: 'name', type: 'text', required: true },
      { name: 'product', type: 'text', required: true },
    ],
    usageCount: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    favorite: false
  },
};

describe('Popup Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (storage.getTemplates as Mock).mockResolvedValue(mockTemplates);
  });

  afterEach(() => {
    (navigator.clipboard.writeText as Mock).mockClear();
  });

  it('should render a list of templates on initial load', async () => {
    await waitFor(() => {
      render(<Popup />);
    });
    expect(await screen.findByText('Test Email Template')).toBeInTheDocument();
  });

  it('should switch to variable form when a template is clicked', async () => {
    await waitFor(() => {
      render(<Popup />);
    });
    const templateCard = await screen.findByText('Test Email Template');
    fireEvent.click(templateCard);
    
    expect(await screen.findByLabelText('name')).toBeInTheDocument();
    expect(await screen.findByLabelText('product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy to Clipboard/i })).toBeInTheDocument();
  });

  it('should execute the template and copy to clipboard', async () => {
    await waitFor(() => {
      render(<Popup />);
    });
    const templateCard = await screen.findByText('Test Email Template');
    fireEvent.click(templateCard);

    const nameInput = await screen.findByLabelText('name');
    const productInput = await screen.findByLabelText('product');
    const copyButton = screen.getByRole('button', { name: /Copy to Clipboard/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(productInput, { target: { value: 'Our App' } });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, John! Welcome to Our App.');
    });

    await waitFor(() => {
        expect(storage.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({
            id: '1',
            usageCount: 6,
        }));
    });

    await waitFor(() => {
        expect(storage.addToHistory).toHaveBeenCalled();
    });
  });

  it('should open the manager when settings icon is clicked', async () => {
    await waitFor(() => {
      render(<Popup />);
    });
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    expect(storage.openManager).toHaveBeenCalled();
  });
}); 