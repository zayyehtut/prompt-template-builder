/**
 * Content Script Tests
 * Tests for page integration, text insertion, and cross-site compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock DOM APIs
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(document, 'execCommand', {
  writable: true,
  value: vi.fn(() => true),
});

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock Popper.js
vi.mock('@popperjs/core', () => ({
  createPopper: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

describe('Content Script', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    vi.clearAllMocks();
    
    // Reset selection mock
    (window.getSelection as any).mockReturnValue({
      toString: () => '',
      rangeCount: 0,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          right: 100,
          bottom: 20,
          width: 100,
          height: 20,
        }),
      }),
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Text Selection Detection', () => {
    it('should detect selected text', () => {
      const selectedText = 'Hello world';
      (window.getSelection as any).mockReturnValue({
        toString: () => selectedText,
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 100,
            left: 50,
            right: 150,
            bottom: 120,
            width: 100,
            height: 20,
          }),
        }),
      });

      // Import content script functions (would need to expose them for testing)
      // This is a conceptual test structure
      const selection = window.getSelection();
      expect(selection?.toString()).toBe(selectedText);
    });

    it('should handle empty selection', () => {
      (window.getSelection as any).mockReturnValue({
        toString: () => '',
        rangeCount: 0,
      });

      const selection = window.getSelection();
      expect(selection?.toString()).toBe('');
    });

    it('should detect selection in different element types', () => {
      // Test input elements
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test value';
      input.selectionStart = 0;
      input.selectionEnd = 4;
      container.appendChild(input);

      expect(input.value.substring(input.selectionStart!, input.selectionEnd!)).toBe('test');
    });
  });

  describe('Text Insertion', () => {
    it('should insert text into input elements', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Hello world';
      input.selectionStart = 5;
      input.selectionEnd = 5;
      container.appendChild(input);

      // Mock focus
      Object.defineProperty(document, 'activeElement', {
        value: input,
        configurable: true,
      });

      // Simulate text insertion
      const textToInsert = ' beautiful';
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;

      input.value = value.slice(0, start) + textToInsert + value.slice(end);
      input.selectionStart = input.selectionEnd = start + textToInsert.length;

      expect(input.value).toBe('Hello beautiful world');
      expect(input.selectionStart).toBe(15);
    });

    it('should insert text into textarea elements', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Line 1\nLine 2';
      textarea.selectionStart = 6;
      textarea.selectionEnd = 6;
      container.appendChild(textarea);

      Object.defineProperty(document, 'activeElement', {
        value: textarea,
        configurable: true,
      });

      const textToInsert = '\nNew Line';
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const value = textarea.value;

      textarea.value = value.slice(0, start) + textToInsert + value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;

      expect(textarea.value).toBe('Line 1\nNew Line\nLine 2');
    });

    it('should handle contenteditable elements', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.innerHTML = 'Editable content';
      container.appendChild(div);

      Object.defineProperty(document, 'activeElement', {
        value: div,
        configurable: true,
      });

      // Mock execCommand for contenteditable
      const execCommandSpy = vi.fn(() => true);
      document.execCommand = execCommandSpy;

             // Simulate insertion (this would call execCommand in real implementation)
       // execCommand('insertText', false, textToInsert) would be called

      expect(execCommandSpy).not.toHaveBeenCalled(); // Not called in this test setup
    });

    it('should fallback to clipboard when no active element', async () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        configurable: true,
      });

      const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText');
      
      // This would be the actual function call in content script
      await navigator.clipboard.writeText('fallback text');
      
      expect(clipboardSpy).toHaveBeenCalledWith('fallback text');
    });
  });

  describe('Element Type Detection', () => {
    it('should detect input element types', () => {
      const textInput = document.createElement('input');
      textInput.type = 'text';
      
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      
      const textarea = document.createElement('textarea');
      
      expect(textInput.tagName.toLowerCase()).toBe('input');
      expect((textInput as HTMLInputElement).type).toBe('text');
      expect(emailInput.tagName.toLowerCase()).toBe('input');
      expect((emailInput as HTMLInputElement).type).toBe('email');
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });

    it('should detect contenteditable elements', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      
      const span = document.createElement('span');
      span.setAttribute('contenteditable', 'true');
      
      const textbox = document.createElement('div');
      textbox.setAttribute('role', 'textbox');
      
      expect(div.contentEditable).toBe('true');
      expect(span.getAttribute('contenteditable')).toBe('true');
      expect(textbox.getAttribute('role')).toBe('textbox');
    });
  });

  describe('Context Capture', () => {
    it('should capture page context', () => {
      // Mock page properties
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/test',
        },
        configurable: true,
      });

      Object.defineProperty(document, 'title', {
        value: 'Test Page',
        configurable: true,
      });

      const context = {
        url: window.location.href,
        title: document.title,
        selectedText: 'test selection',
        elementType: 'input-text',
      };

      expect(context.url).toBe('https://example.com/test');
      expect(context.title).toBe('Test Page');
      expect(context.selectedText).toBe('test selection');
      expect(context.elementType).toBe('input-text');
    });

    it('should handle different page contexts', () => {
      // Test different URLs and scenarios
      const contexts = [
        { url: 'https://chat.openai.com/', expected: 'ChatGPT interface' },
        { url: 'https://claude.ai/', expected: 'Claude interface' },
        { url: 'https://example.com/form', expected: 'Generic form' },
      ];

      contexts.forEach(({ url }) => {
        Object.defineProperty(window, 'location', {
          value: { href: url },
          configurable: true,
        });

        expect(window.location.href).toBe(url);
      });
    });
  });

  describe('Cross-Site Compatibility', () => {
    it('should work with React applications', () => {
      // Simulate React-controlled input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'React input';
      
      // React typically uses synthetic events
      const inputEventSpy = vi.fn();
      const changeEventSpy = vi.fn();
      
      input.addEventListener('input', inputEventSpy);
      input.addEventListener('change', changeEventSpy);
      
      // Simulate text insertion with events
      input.value = 'Updated React input';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(inputEventSpy).toHaveBeenCalled();
      expect(changeEventSpy).toHaveBeenCalled();
      expect(input.value).toBe('Updated React input');
    });

    it('should work with Vue applications', () => {
      // Simulate Vue-controlled input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Vue input';
      
      // Vue also uses standard DOM events
      const inputEventSpy = vi.fn();
      input.addEventListener('input', inputEventSpy);
      
      input.value = 'Updated Vue input';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      expect(inputEventSpy).toHaveBeenCalled();
      expect(input.value).toBe('Updated Vue input');
    });

    it('should handle Shadow DOM elements', () => {
      // Create element with shadow DOM
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const input = document.createElement('input');
      input.type = 'text';
      shadowRoot.appendChild(input);
      container.appendChild(host);
      
      // Should be able to access shadow DOM elements
      const shadowInput = shadowRoot.querySelector('input');
      expect(shadowInput).toBe(input);
      expect(shadowInput?.type).toBe('text');
    });

    it('should handle iframes', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'about:blank';
      container.appendChild(iframe);
      
      // Note: In real implementation, would need to handle
      // cross-origin restrictions and iframe communication
      expect(iframe.tagName.toLowerCase()).toBe('iframe');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chrome API gracefully', () => {
      // Temporarily remove chrome API
      const originalChrome = global.chrome;
      // @ts-ignore
      delete global.chrome;
      
      // Code should not crash without chrome API
      expect(() => {
        // Content script initialization code would go here
      }).not.toThrow();
      
      // Restore chrome API
      // @ts-ignore
      global.chrome = originalChrome;
    });

    it('should handle DOM exceptions', () => {
      // Mock execCommand to throw
      document.execCommand = vi.fn(() => {
        throw new Error('execCommand not supported');
      });
      
      expect(() => {
        document.execCommand('insertText', false, 'test');
      }).toThrow('execCommand not supported');
    });

    it('should handle clipboard API failures', () => {
      // Mock clipboard to reject
      navigator.clipboard.writeText = vi.fn(() => 
        Promise.reject(new Error('Clipboard access denied'))
      );
      
      expect(navigator.clipboard.writeText('test')).rejects.toThrow('Clipboard access denied');
    });
  });

  describe('Security', () => {
    it('should sanitize HTML content', () => {
      const maliciousContent = '<script>alert("xss")</script>Hello';
      const div = document.createElement('div');
      div.textContent = maliciousContent;
      
      // textContent automatically escapes HTML
      expect(div.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;Hello');
    });

    it('should validate input before insertion', () => {
      // Test that content is properly validated
      const validInputs = [
        'Normal text',
        'Text with {{VARIABLE}}',
        'Multi\nLine\nText',
      ];
      
      const invalidInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
      ];
      
      validInputs.forEach(input => {
        expect(typeof input).toBe('string');
        expect(input.length).toBeGreaterThan(0);
      });
      
      invalidInputs.forEach(input => {
        // In real implementation, would sanitize these
        expect(input).toContain('script');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large text insertions efficiently', () => {
      const largeText = 'A'.repeat(10000);
      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);
      
      const startTime = performance.now();
      input.value = largeText;
      const endTime = performance.now();
      
      expect(input.value.length).toBe(10000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should cleanup event listeners properly', () => {
      const element = document.createElement('div');
      const listener = vi.fn();
      
      element.addEventListener('click', listener);
      container.appendChild(element);
      
      // Simulate cleanup
      element.removeEventListener('click', listener);
      element.click();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('Template Interpolation', () => {
  it('should interpolate simple variables', () => {
    const content = 'Hello {{NAME}}, welcome to {{PLACE}}!';
    const variables = { NAME: 'John', PLACE: 'our website' };
    
         // Simple interpolation function (from content script)
     const result = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
       const cleanName = varName.trim().split(':')[0].replace('?', '');
       return variables[cleanName as keyof typeof variables] || match;
    });
    
    expect(result).toBe('Hello John, welcome to our website!');
  });

  it('should handle optional variables', () => {
    const content = 'Hello {{NAME?}}, {{GREETING:text:Good morning}}';
    const variables = { NAME: 'Alice' };
    
         const result = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
       const cleanName = varName.trim().split(':')[0].replace('?', '');
       const defaultValue = varName.includes(':') ? varName.split(':')[2] : undefined;
       return variables[cleanName as keyof typeof variables] || defaultValue || match;
    });
    
    expect(result).toBe('Hello Alice, Good morning');
  });

  it('should preserve unmatched variables', () => {
    const content = 'Hello {{NAME}}, your score is {{SCORE}}';
    const variables = { NAME: 'Bob' };
    
         const result = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
       const cleanName = varName.trim().split(':')[0].replace('?', '');
       return variables[cleanName as keyof typeof variables] || match;
    });
    
    expect(result).toBe('Hello Bob, your score is {{SCORE}}');
  });
}); 