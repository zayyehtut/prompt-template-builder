/**
 * Content Script for Prompt Template Builder
 * Handles page integration, text selection, template insertion, and context capture
 */

import { createPopper, Instance as PopperInstance } from '@popperjs/core';

// Types for content script
interface PageContext {
  url: string;
  title: string;
  selectedText?: string;
  elementType?: string;
}

// Global state
let currentTooltip: HTMLElement | null = null;
let currentPopper: PopperInstance | null = null;
let isInitialized = false;

/**
 * Initialize the content script
 */
function initialize() {
  if (isInitialized) return;
  
  console.log('Prompt Template Builder content script loaded');
  
  // Setup message listeners
  setupMessageListeners();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup keyboard shortcuts
  setupKeyboardListeners();
  
  // Initialize styles
  injectStyles();
  
  isInitialized = true;
}

/**
 * Setup message listeners for communication with extension
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    try {
      switch (request.action) {
        case 'getSelectedText': {
          const selectedText = getSelectedText();
          sendResponse({ text: selectedText });
          break;
        }
          
        case 'insertText':
          insertTextAtCursor(request.text);
          sendResponse({ success: true });
          break;
          
        case 'showPreview':
          showInlinePreview(request.template, request.variables);
          sendResponse({ success: true });
          break;
          
        case 'getContext': {
          const context = getCurrentContext();
          sendResponse({ context });
          break;
        }
          
        case 'hideTooltip':
          hideTooltip();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
         } catch (error) {
       console.error('Content script message handler error:', error);
       sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    return true; // Keep message channel open for async responses
  });
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
  // Text selection listener
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Focus tracking for better insertion
  document.addEventListener('focusin', handleFocusChange);
  document.addEventListener('focusout', handleFocusChange);
  
  // Click outside to hide tooltip
  document.addEventListener('click', handleDocumentClick, true);
  
  // Keyboard navigation in inputs
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardListeners() {
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Shift + Space to open extension
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'Space') {
      event.preventDefault();
      chrome.runtime.sendMessage({ action: 'openPopup' });
    }
    
    // Ctrl/Cmd + Shift + P for quick access
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyP') {
      event.preventDefault();
      chrome.runtime.sendMessage({ action: 'openQuickAccess' });
    }
  });
}

/**
 * Get currently selected text
 */
function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

/**
 * Handle text selection events
 */
function handleTextSelection() {
  const selectedText = getSelectedText();
  
  if (selectedText && selectedText.length > 0) {
    // Notify background script about text selection
    const context = getCurrentContext();
    context.selectedText = selectedText;
    context.elementType = getActiveElementType();
    
    chrome.runtime.sendMessage({
      action: 'textSelected',
      selectedText,
      context
    });
    
    // Optionally show quick action tooltip
    showQuickActionTooltip(selectedText);
  } else {
    hideTooltip();
  }
}

/**
 * Get current page context
 */
function getCurrentContext(): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    selectedText: getSelectedText(),
    elementType: getActiveElementType()
  };
}

/**
 * Get the type of currently active element
 */
function getActiveElementType(): string {
  const activeElement = document.activeElement;
  
  if (!activeElement) return 'none';
  
  const tagName = activeElement.tagName.toLowerCase();
  
  if (tagName === 'input') {
    const type = (activeElement as HTMLInputElement).type;
    return `input-${type}`;
  }
  
     if (tagName === 'textarea') return 'textarea';
   if ((activeElement as HTMLElement).contentEditable === 'true') return 'contenteditable';
   if (tagName === 'div' && activeElement.getAttribute('role') === 'textbox') return 'textbox';
  
  return tagName;
}

/**
 * Insert text at cursor position in various input types
 */
function insertTextAtCursor(text: string) {
  const activeElement = document.activeElement as HTMLElement;
  
  if (!activeElement) {
    // Fallback: copy to clipboard
    copyToClipboard(text);
    showNotification('Text copied to clipboard');
    return;
  }
  
  try {
    if (isInputElement(activeElement)) {
      insertIntoInputElement(activeElement as HTMLInputElement | HTMLTextAreaElement, text);
    } else if (isContentEditable(activeElement)) {
      insertIntoContentEditable(activeElement, text);
    } else {
      // For other elements, try to find a nearby input
      const nearbyInput = findNearbyInput(activeElement);
      if (nearbyInput) {
        nearbyInput.focus();
        insertIntoInputElement(nearbyInput, text);
      } else {
        copyToClipboard(text);
        showNotification('Text copied to clipboard');
      }
    }
  } catch (error) {
    console.error('Error inserting text:', error);
    copyToClipboard(text);
    showNotification('Text copied to clipboard');
  }
}

/**
 * Check if element is an input element
 */
function isInputElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea';
}

/**
 * Check if element is content editable
 */
function isContentEditable(element: HTMLElement): boolean {
  return element.contentEditable === 'true' || 
         element.getAttribute('role') === 'textbox' ||
         element.getAttribute('contenteditable') === 'true';
}

/**
 * Insert text into input or textarea element
 */
function insertIntoInputElement(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = element.selectionStart || 0;
  const end = element.selectionEnd || 0;
  const value = element.value;
  
  element.value = value.slice(0, start) + text + value.slice(end);
  element.selectionStart = element.selectionEnd = start + text.length;
  element.focus();
  
  // Trigger events for frameworks (React, Vue, etc.)
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Insert text into content editable element
 */
function insertIntoContentEditable(element: HTMLElement, text: string) {
  element.focus();
  
  // Try modern approach first
  if (document.execCommand) {
    document.execCommand('insertText', false, text);
  } else {
    // Fallback for newer browsers
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  
  // Trigger input event
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Find nearby input element
 */
function findNearbyInput(element: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  // Look for inputs in the same form
  const form = element.closest('form');
  if (form) {
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea');
    if (inputs.length > 0) {
      return inputs[0] as HTMLInputElement | HTMLTextAreaElement;
    }
  }
  
  // Look for inputs in the same container
  const container = element.closest('div, section, article');
  if (container) {
    const inputs = container.querySelectorAll('input[type="text"], input[type="email"], textarea');
    if (inputs.length > 0) {
      return inputs[0] as HTMLInputElement | HTMLTextAreaElement;
    }
  }
  
  return null;
}

/**
 * Show quick action tooltip for selected text
 */
function showQuickActionTooltip(selectedText: string) {
  // Don't show tooltip if text is too long
  if (selectedText.length > 200) return;
  
  hideTooltip();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'prompt-template-quick-tooltip';
  tooltip.innerHTML = `
    <div class="quick-tooltip-content">
      <button class="quick-action-btn" data-action="use-as-context">
        📝 Use as Context
      </button>
      <button class="quick-action-btn" data-action="create-template">
        ✨ Create Template
      </button>
    </div>
  `;
  
  document.body.appendChild(tooltip);
  
  // Position tooltip
  const virtualElement = {
    getBoundingClientRect: () => rect
  };
  
  currentPopper = createPopper(virtualElement, tooltip, {
    placement: 'top',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 16,
        },
      },
    ],
  });
  
  currentTooltip = tooltip;
  
  // Handle tooltip actions
  tooltip.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    
    if (action === 'use-as-context') {
      chrome.runtime.sendMessage({
        action: 'useAsContext',
        text: selectedText,
        context: getCurrentContext()
      });
    } else if (action === 'create-template') {
      chrome.runtime.sendMessage({
        action: 'createTemplate',
        text: selectedText,
        context: getCurrentContext()
      });
    }
    
    hideTooltip();
  });
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (currentTooltip === tooltip) {
      hideTooltip();
    }
  }, 5000);
}

/**
 * Show inline preview tooltip
 */
function showInlinePreview(template: { id: string; name: string; content: string }, variables: Record<string, unknown>) {
  hideTooltip();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Interpolate template content
  const content = interpolateTemplate(template.content, variables);
  
  // Create preview tooltip
  const preview = document.createElement('div');
  preview.className = 'prompt-template-preview';
  preview.innerHTML = `
    <div class="preview-header">
      <span class="template-name">${escapeHtml(template.name)}</span>
      <button class="close-btn" aria-label="Close">×</button>
    </div>
    <div class="preview-content">${escapeHtml(content)}</div>
    <div class="preview-actions">
      <button class="action-btn primary" data-action="use">Insert</button>
      <button class="action-btn secondary" data-action="copy">Copy</button>
      <button class="action-btn secondary" data-action="edit">Edit</button>
    </div>
  `;
  
  document.body.appendChild(preview);
  
  // Position preview
  const virtualElement = {
    getBoundingClientRect: () => rect
  };
  
  currentPopper = createPopper(virtualElement, preview, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 16,
        },
      },
    ],
  });
  
  currentTooltip = preview;
  
  // Handle preview actions
  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    
    if (action === 'use') {
      insertTextAtCursor(content);
      hideTooltip();
    } else if (action === 'copy') {
      copyToClipboard(content);
      showNotification('Copied to clipboard');
      hideTooltip();
    } else if (action === 'edit') {
      chrome.runtime.sendMessage({
        action: 'editTemplate',
        templateId: template.id
      });
      hideTooltip();
    } else if (target.classList.contains('close-btn')) {
      hideTooltip();
    }
  });
}

/**
 * Simple template interpolation
 */
function interpolateTemplate(content: string, variables: Record<string, unknown>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const cleanName = varName.trim().split(':')[0].replace('?', '');
    const value = variables[cleanName];
    return typeof value === 'string' ? value : match;
  });
}

/**
 * Hide current tooltip
 */
function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
  
  if (currentPopper) {
    currentPopper.destroy();
    currentPopper = null;
  }
}

/**
 * Handle document clicks to hide tooltip
 */
function handleDocumentClick(event: Event) {
  const target = event.target as HTMLElement;
  
  // Don't hide if clicking within tooltip
  if (currentTooltip && currentTooltip.contains(target)) {
    return;
  }
  
  hideTooltip();
}

/**
 * Handle focus changes
 */
function handleFocusChange(event: Event) {
  // Store the last focused element for better insertion
  if (event.type === 'focusin') {
    const target = event.target as HTMLElement;
    if (isInputElement(target) || isContentEditable(target)) {
      // Could store this for better insertion targeting
    }
  }
}

/**
 * Handle keyboard events
 */
function handleKeyDown(event: KeyboardEvent) {
  // Escape key to hide tooltip
  if (event.key === 'Escape' && currentTooltip) {
    hideTooltip();
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
     } catch {
     // Fallback for older browsers
     const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Show notification to user
 */
function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.className = 'prompt-template-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Inject CSS styles for tooltips and notifications
 */
function injectStyles() {
  if (document.getElementById('prompt-template-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'prompt-template-styles';
  style.textContent = `
    .prompt-template-quick-tooltip {
      position: fixed;
      z-index: 10000;
      background: #1f2937;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.2s ease-out;
    }
    
    .quick-tooltip-content {
      display: flex;
      gap: 8px;
    }
    
    .quick-action-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    
    .quick-action-btn:hover {
      background: #2563eb;
    }
    
    .prompt-template-preview {
      position: fixed;
      z-index: 10000;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      animation: fadeIn 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .preview-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
      border-radius: 8px 8px 0 0;
    }
    
    .template-name {
      font-weight: 600;
      color: #111827;
      font-size: 14px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      color: #374151;
    }
    
    .preview-content {
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    
    .preview-actions {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    
    .action-btn {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
    }
    
    .action-btn.primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    
    .action-btn.primary:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
    
    .action-btn.secondary {
      background: white;
      color: #374151;
      border-color: #d1d5db;
    }
    
    .action-btn.secondary:hover {
      background: #f9fafb;
    }
    
    .prompt-template-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 