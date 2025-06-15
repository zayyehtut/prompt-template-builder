# Technical Specification Document (TSD) - Simplified Browser Extension MVP

**Purpose:** Browser extension for personal prompt template management with direct AI integration

**Technical Specifications: Prompt Template Builder Extension**

## 1. System Architecture Overview

### Architecture Pattern: Browser Extension with Local Storage

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser Extension                             │
├─────────────────────────┬───────────────────────┬──────────────────┤
│   Popup UI              │   Content Script      │  Background      │
│   - Template List       │   - Text Selection    │  Service Worker  │
│   - Quick Editor        │   - Context Menu      │  - Storage Sync  │
│   - Variable Inputs     │   - Inline Preview    │  - API Calls     │
└───────────┬─────────────┴──────────┬────────────┴──────────┬───────┘
            │                        │                         │
            ▼                        ▼                         ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Browser Storage APIs                            │
├─────────────────────────┬───────────────────────┬────────────────┤
│  chrome.storage.local   │  chrome.storage.sync  │   IndexedDB    │
│  - Templates            │  - Settings           │   - History     │
│  - Variables            │  - Presets            │   - Cache       │
└─────────────────────────┴───────────────────────┴────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    External Services (Optional)                    │
├─────────────────────────┬───────────────────────────────────────┤
│  AI APIs                │  GitHub Gist (Backup)                  │
│  - OpenAI/Claude        │  - Template Sharing                    │
│  - Direct Integration   │  - Version Control                     │
└─────────────────────────┴───────────────────────────────────────┘
```

### Component Interactions:

1. **Popup UI**: Main interface for template management
2. **Content Script**: Enables in-page template insertion and context capture
3. **Background Service Worker**: Handles storage, API calls, and cross-tab sync
4. **Local Storage**: All data stored locally, with optional sync across devices
5. **External Services**: Optional AI integration and backup

### Key Design Decisions:
- **Zero Backend**: Everything runs in the browser
- **Local-First**: All data stored locally with chrome.storage
- **Instant Access**: Keyboard shortcuts for quick template access
- **Privacy-First**: No data leaves the browser unless explicitly shared
- **Progressive Enhancement**: Start simple, add features as needed

## 2. Technology Stack

### Core Extension Stack
- **Manifest Version**: V3 (latest Chrome extension standard)
- **Language**: TypeScript 5.0+
- **Bundler**: Vite 5.0+ with CRXJS plugin
- **UI Framework**: React 18+ (for popup and options page)
- **Styling**: Tailwind CSS 3.4+ (compiled for extension)
- **State Management**: Zustand (lightweight, perfect for extensions)
- **Editor**: CodeMirror 6 (lighter than Tiptap for extension)

### Storage
- **Primary Storage**: chrome.storage.local (no size limits)
- **Sync Storage**: chrome.storage.sync (100KB limit, for settings)
- **Large Data**: IndexedDB (for execution history)
- **Cache**: In-memory cache in service worker

### Development Tools
- **Testing**: Vitest + @testing-library/react
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Hot Reload**: CRXJS Vite Plugin

### Build Output
```
dist/
├── manifest.json
├── popup/
│   ├── index.html
│   └── index.js
├── content/
│   └── index.js
├── background/
│   └── service-worker.js
├── options/
│   ├── index.html
│   └── index.js
└── assets/
    ├── icons/
    └── styles.css
```

## 3. Data Model & Storage Schema

### Storage Structure

```typescript
// types/storage.ts
interface StorageSchema {
  // Templates stored in chrome.storage.local
  templates: {
    [id: string]: Template;
  };
  
  // User settings in chrome.storage.sync
  settings: UserSettings;
  
  // Variable presets in chrome.storage.local
  presets: {
    [templateId: string]: VariablePreset[];
  };
  
  // Execution history in IndexedDB
  history: ExecutionRecord[];
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: Variable[];
  category?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  favorite: boolean;
  hotkey?: string; // e.g., "cmd+shift+1"
}

interface Variable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  defaultValue?: any;
  options?: string[]; // for select type
  required: boolean;
  description?: string;
}

interface VariablePreset {
  id: string;
  name: string;
  values: Record<string, any>;
  isDefault: boolean;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultCategory: string;
  enableShortcuts: boolean;
  autoClose: boolean;
  syncEnabled: boolean;
  aiProvider?: 'openai' | 'claude' | 'none';
  aiApiKey?: string; // Encrypted
}

interface ExecutionRecord {
  id: string;
  templateId: string;
  templateName: string;
  variables: Record<string, any>;
  output: string;
  executedAt: number;
  context?: {
    url?: string;
    selectedText?: string;
  };
}
```

### Storage Implementation

```typescript
// lib/storage.ts
class ExtensionStorage {
  // Save template
  async saveTemplate(template: Template): Promise<void> {
    const templates = await this.getTemplates();
    templates[template.id] = template;
    await chrome.storage.local.set({ templates });
  }
  
  // Get all templates
  async getTemplates(): Promise<Record<string, Template>> {
    const { templates = {} } = await chrome.storage.local.get('templates');
    return templates;
  }
  
  // Search templates
  async searchTemplates(query: string): Promise<Template[]> {
    const templates = await this.getTemplates();
    const fuse = new Fuse(Object.values(templates), {
      keys: ['name', 'content', 'tags'],
      threshold: 0.3,
    });
    return fuse.search(query).map(r => r.item);
  }
  
  // Settings with encryption for API keys
  async saveSettings(settings: UserSettings): Promise<void> {
    if (settings.aiApiKey) {
      settings.aiApiKey = await encryptData(settings.aiApiKey);
    }
    await chrome.storage.sync.set({ settings });
  }
  
  // History in IndexedDB for better performance
  async addToHistory(record: ExecutionRecord): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction('history', 'readwrite');
    await tx.objectStore('history').add(record);
    
    // Keep only last 1000 records
    const count = await tx.objectStore('history').count();
    if (count > 1000) {
      const oldestKey = await tx.objectStore('history')
        .openCursor(null, 'next')
        .then(cursor => cursor?.key);
      if (oldestKey) {
        await tx.objectStore('history').delete(oldestKey);
      }
    }
  }
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PromptTemplateDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('templateId', 'templateId');
          store.createIndex('executedAt', 'executedAt');
        }
      };
    });
  }
}
```

## 4. Extension Components

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Prompt Template Builder",
  "version": "1.0.0",
  "description": "Create and manage reusable prompt templates with variables",
  
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "clipboardWrite"
  ],
  
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://bard.google.com/*"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ],
  
  "options_page": "options/index.html",
  
  "commands": {
    "open-popup": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Open template popup"
    },
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Space",
        "mac": "Command+Shift+Space"
      }
    }
  }
}
```

### Popup Component (Main UI)

```typescript
// popup/App.tsx
import { useState, useEffect } from 'react';
import { TemplateList } from './components/TemplateList';
import { QuickEditor } from './components/QuickEditor';
import { VariableForm } from './components/VariableForm';
import { storage } from '@/lib/storage';

export function PopupApp() {
  const [mode, setMode] = useState<'list' | 'edit' | 'execute'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    const allTemplates = await storage.getTemplates();
    setTemplates(Object.values(allTemplates));
  };
  
  const handleExecute = async (template: Template, variables: Record<string, any>) => {
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
    template.usageCount++;
    await storage.saveTemplate(template);
    
    // Close popup if autoClose is enabled
    const { settings } = await chrome.storage.sync.get('settings');
    if (settings?.autoClose) {
      window.close();
    }
  };
  
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
        />
      )}
      
      {mode === 'edit' && (
        <QuickEditor
          template={selectedTemplate}
          onSave={async (template) => {
            await storage.saveTemplate(template);
            await loadTemplates();
            setMode('list');
          }}
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
```

### Content Script

```typescript
// content/index.ts
import { createPopper } from '@popperjs/core';

// Listen for messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    sendResponse({ text: window.getSelection()?.toString() || '' });
  }
  
  if (request.action === 'insertText') {
    insertTextAtCursor(request.text);
  }
  
  if (request.action === 'showPreview') {
    showInlinePreview(request.template, request.variables);
  }
});

// Add context menu on text selection
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    chrome.runtime.sendMessage({
      action: 'textSelected',
      text: selection.toString(),
      context: {
        url: window.location.href,
        title: document.title,
      }
    });
  }
});

// Insert text at cursor position
function insertTextAtCursor(text: string) {
  const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
  
  if (activeElement && ('value' in activeElement)) {
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    const value = activeElement.value;
    
    activeElement.value = value.slice(0, start) + text + value.slice(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
    activeElement.focus();
    
    // Trigger input event for React/Vue/etc
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // For contenteditable or other elements
    document.execCommand('insertText', false, text);
  }
}

// Show inline preview tooltip
function showInlinePreview(template: Template, variables: Record<string, any>) {
  const preview = document.createElement('div');
  preview.className = 'prompt-template-preview';
  preview.innerHTML = `
    <div class="preview-header">${template.name}</div>
    <div class="preview-content">${interpolateTemplate(template.content, variables)}</div>
    <div class="preview-actions">
      <button data-action="use">Use</button>
      <button data-action="edit">Edit</button>
    </div>
  `;
  
  document.body.appendChild(preview);
  
  // Position near cursor
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    createPopper(
      { getBoundingClientRect: () => rect },
      preview,
      { placement: 'top' }
    );
  }
  
  // Handle actions
  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.action === 'use') {
      insertTextAtCursor(interpolateTemplate(template.content, variables));
      preview.remove();
    } else if (target.dataset.action === 'edit') {
      chrome.runtime.sendMessage({ action: 'openEditor', templateId: template.id });
      preview.remove();
    }
  });
  
  // Remove on click outside
  setTimeout(() => {
    document.addEventListener('click', function removePreview(e) {
      if (!preview.contains(e.target as Node)) {
        preview.remove();
        document.removeEventListener('click', removePreview);
      }
    });
  }, 100);
}
```

### Background Service Worker

```typescript
// background/service-worker.ts
import { storage } from '@/lib/storage';
import { nanoid } from 'nanoid';

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'prompt-templates',
    title: 'Prompt Templates',
    contexts: ['selection', 'editable'],
  });
  
  // Create sub-menus for favorite templates
  updateContextMenus();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'prompt-templates') {
    // Open popup
    chrome.action.openPopup();
  } else if (info.menuItemId.toString().startsWith('template-')) {
    // Execute template
    const templateId = info.menuItemId.toString().replace('template-', '');
    const template = await storage.getTemplate(templateId);
    
    if (template && tab?.id) {
      // Get selected text as context
      const context = {
        selectedText: info.selectionText,
        url: tab.url,
      };
      
      // Send to popup for variable input
      chrome.runtime.sendMessage({
        action: 'executeTemplate',
        template,
        context,
      });
    }
  }
});

// Update context menus based on favorites
async function updateContextMenus() {
  // Remove existing template items
  const existingItems = await chrome.contextMenus.removeAll();
  
  // Re-create base menu
  chrome.contextMenus.create({
    id: 'prompt-templates',
    title: 'Prompt Templates',
    contexts: ['selection', 'editable'],
  });
  
  // Add favorite templates
  const templates = await storage.getTemplates();
  const favorites = Object.values(templates)
    .filter(t => t.favorite)
    .slice(0, 10); // Limit to 10 favorites
  
  for (const template of favorites) {
    chrome.contextMenus.create({
      id: `template-${template.id}`,
      parentId: 'prompt-templates',
      title: template.name,
      contexts: ['selection', 'editable'],
    });
  }
  
  if (favorites.length > 0) {
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'prompt-templates',
      type: 'separator',
      contexts: ['selection', 'editable'],
    });
  }
  
  chrome.contextMenus.create({
    id: 'open-all',
    parentId: 'prompt-templates',
    title: 'View All Templates...',
    contexts: ['selection', 'editable'],
  });
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup') {
    // Get current tab for context
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.id) {
      // Get selected text
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getSelectedText' 
      });
      
      // Store context for popup
      await chrome.storage.session.set({
        popupContext: {
          selectedText: response?.text,
          url: tab.url,
          title: tab.title,
        }
      });
    }
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Handle messages from popup/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenus') {
    updateContextMenus();
  }
  
  if (request.action === 'exportTemplates') {
    exportTemplates().then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'importTemplates') {
    importTemplates(request.data).then(sendResponse);
    return true;
  }
});

// Export templates to JSON
async function exportTemplates() {
  const templates = await storage.getTemplates();
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    templates: Object.values(templates),
  };
  
  return JSON.stringify(data, null, 2);
}

// Import templates from JSON
async function importTemplates(jsonData: string) {
  try {
    const data = JSON.parse(jsonData);
    const templates = data.templates || [];
    
    for (const template of templates) {
      // Generate new ID to avoid conflicts
      template.id = nanoid();
      await storage.saveTemplate(template);
    }
    
    return { success: true, count: templates.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## 5. Key Algorithms & Features

### Variable Detection and Parsing

```typescript
// lib/template-parser.ts
export interface ParsedVariable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
}

export function parseTemplate(content: string): {
  variables: ParsedVariable[];
  plainText: string;
} {
  const variables = new Map<string, ParsedVariable>();
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    const varDef = match[1].trim();
    const parsed = parseVariableDefinition(varDef);
    variables.set(parsed.name, parsed);
  }
  
  // Extract plain text for search
  const plainText = content.replace(variableRegex, ' ').replace(/\s+/g, ' ').trim();
  
  return {
    variables: Array.from(variables.values()),
    plainText,
  };
}

function parseVariableDefinition(definition: string): ParsedVariable {
  // Support formats:
  // {{NAME}}
  // {{NAME:type}}
  // {{NAME:type:default}}
  // {{NAME:type?}} (optional)
  
  const parts = definition.split(':');
  const namePart = parts[0];
  const isOptional = namePart.endsWith('?');
  const name = namePart.replace('?', '').trim().toUpperCase();
  
  const type = inferType(parts[1]?.trim() || '', name);
  const defaultValue = parts[2]?.trim();
  
  return {
    name,
    type,
    required: !isOptional && !defaultValue,
    defaultValue: parseDefaultValue(defaultValue, type),
    placeholder: generatePlaceholder(name, type),
  };
}

function inferType(explicit: string, name: string): ParsedVariable['type'] {
  if (explicit) {
    const typeMap: Record<string, ParsedVariable['type']> = {
      'text': 'text',
      'string': 'text',
      'number': 'number',
      'int': 'number',
      'float': 'number',
      'bool': 'boolean',
      'boolean': 'boolean',
      'date': 'date',
      'select': 'select',
      'choice': 'select',
    };
    return typeMap[explicit.toLowerCase()] || 'text';
  }
  
  // Infer from name
  if (/^(IS_|HAS_|SHOULD_|ENABLE_)/.test(name)) return 'boolean';
  if (/_(DATE|TIME|WHEN)$/.test(name)) return 'date';
  if (/_(COUNT|NUMBER|AMOUNT|QUANTITY|PRICE)$/.test(name)) return 'number';
  if (/_(TYPE|STATUS|CATEGORY|OPTION)$/.test(name)) return 'select';
  
  return 'text';
}
```

### Smart Template Interpolation

```typescript
// lib/interpolation.ts
export function interpolateTemplate(
  template: string,
  variables: Record<string, any>,
  options: InterpolationOptions = {}
): string {
  const { 
    throwOnMissing = false,
    highlightMissing = true,
    transformers = {}
  } = options;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, varDef) => {
    const parts = varDef.split(':');
    const name = parts[0].replace('?', '').trim().toUpperCase();
    
    if (!(name in variables)) {
      if (throwOnMissing) {
        throw new Error(`Missing required variable: ${name}`);
      }
      if (highlightMissing) {
        return `[MISSING: ${name}]`;
      }
      return match;
    }
    
    let value = variables[name];
    
    // Apply transformers
    if (transformers[name]) {
      value = transformers[name](value);
    }
    
    // Format based on type
    if (typeof value === 'boolean') {
      value = value ? 'Yes' : 'No';
    } else if (value instanceof Date) {
      value = value.toLocaleDateString();
    } else if (value === null || value === undefined) {
      value = '';
    }
    
    return String(value);
  });
}

// Advanced interpolation with conditionals
export function interpolateAdvanced(
  template: string,
  variables: Record<string, any>
): string {
  // Support conditional blocks: {{#IF CONDITION}}...{{/IF}}
  template = template.replace(
    /\{\{#IF\s+([^}]+)\}\}(.*?)\{\{\/IF\}\}/gs,
    (match, condition, content) => {
      if (evaluateCondition(condition, variables)) {
        return interpolateAdvanced(content, variables);
      }
      return '';
    }
  );
  
  // Support loops: {{#EACH ITEMS}}...{{/EACH}}
  template = template.replace(
    /\{\{#EACH\s+([^}]+)\}\}(.*?)\{\{\/EACH\}\}/gs,
    (match, itemsVar, content) => {
      const items = variables[itemsVar];
      if (Array.isArray(items)) {
        return items.map((item, index) => {
          const itemVars = {
            ...variables,
            ITEM: item,
            INDEX: index,
          };
          return interpolateAdvanced(content, itemVars);
        }).join('');
      }
      return '';
    }
  );
  
  // Standard interpolation
  return interpolateTemplate(template, variables);
}
```

### Quick Access System

```typescript
// lib/quick-access.ts
export class QuickAccessManager {
  private shortcuts: Map<string, string> = new Map();
  
  async initialize() {
    // Load custom shortcuts
    const { shortcuts = {} } = await chrome.storage.sync.get('shortcuts');
    this.shortcuts = new Map(Object.entries(shortcuts));
    
    // Register listeners
    this.setupKeyboardListeners();
    this.setupOmniboxIntegration();
  }
  
  private setupKeyboardListeners() {
    // Listen for hotkeys in content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'hotkey' && request.key) {
        const templateId = this.shortcuts.get(request.key);
        if (templateId) {
          this.executeTemplate(templateId, sender.tab?.id);
        }
      }
    });
  }
  
  private setupOmniboxIntegration() {
    // Enable typing "pt" in address bar
    chrome.omnibox.onInputChanged.addListener(
      debounce(async (text, suggest) => {
        const templates = await storage.searchTemplates(text);
        const suggestions = templates.slice(0, 5).map(t => ({
          content: t.name,
          description: `Template: ${t.name} - ${t.description || 'No description'}`,
        }));
        suggest(suggestions);
      }, 300)
    );
    
    chrome.omnibox.onInputEntered.addListener(async (text) => {
      const templates = await storage.searchTemplates(text);
      if (templates.length > 0) {
        chrome.action.openPopup();
        // Send message to popup to select template
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'selectTemplate',
            templateId: templates[0].id,
          });
        }, 100);
      }
    });
  }
  
  async executeTemplate(templateId: string, tabId?: number) {
    const template = await storage.getTemplate(templateId);
    if (!template) return;
    
    // If template has no variables, execute immediately
    if (template.variables.length === 0) {
      const output = template.content;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: 'insertText',
          text: output,
        });
      } else {
        await navigator.clipboard.writeText(output);
      }
      
      // Track usage
      await this.trackUsage(templateId);
    } else {
      // Open popup for variable input
      chrome.action.openPopup();
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'executeTemplate',
          templateId,
        });
      }, 100);
    }
  }
}
```

### Template Categories & Smart Organization

```typescript
// lib/organization.ts
export class TemplateOrganizer {
  private readonly DEFAULT_CATEGORIES = [
    { id: 'email', name: 'Email', icon: '✉️' },
    { id: 'code', name: 'Code', icon: '💻' },
    { id: 'writing', name: 'Writing', icon: '✍️' },
    { id: 'data', name: 'Data Analysis', icon: '📊' },
    { id: 'personal', name: 'Personal', icon: '👤' },
  ];
  
  async suggestCategory(template: Template): Promise<string> {
    const keywords = {
      email: ['email', 'dear', 'regards', 'sincerely', 'subject'],
      code: ['function', 'class', 'return', 'import', 'console'],
      writing: ['article', 'blog', 'story', 'paragraph', 'introduction'],
      data: ['analyze', 'data', 'report', 'metrics', 'statistics'],
    };
    
    const content = template.content.toLowerCase();
    const scores: Record<string, number> = {};
    
    for (const [category, words] of Object.entries(keywords)) {
      scores[category] = words.filter(w => content.includes(w)).length;
    }
    
    const bestMatch = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];
    
    return bestMatch && bestMatch[1] > 0 ? bestMatch[0] : 'personal';
  }
  
  async autoTag(template: Template): Promise<string[]> {
    const tags = new Set<string>();
    
    // Extract from template name
    const nameWords = template.name.toLowerCase().split(/\s+/);
    nameWords.forEach(word => {
      if (word.length > 3) tags.add(word);
    });
    
    // Common patterns
    if (/\b(api|endpoint|request)\b/i.test(template.content)) {
      tags.add('api');
    }
    if (/\b(bug|fix|issue)\b/i.test(template.content)) {
      tags.add('debugging');
    }
    if (/\b(meeting|agenda|minutes)\b/i.test(template.content)) {
      tags.add('meeting');
    }
    
    return Array.from(tags).slice(0, 5);
  }
}
```

## 6. Testing Strategy

### Unit Tests

```typescript
// tests/template-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseTemplate } from '@/lib/template-parser';

describe('Template Parser', () => {
  it('should parse simple variables', () => {
    const content = 'Hello {{NAME}}, welcome to {{PLACE}}!';
    const result = parseTemplate(content);
    
    expect(result.variables).toHaveLength(2);
    expect(result.variables[0]).toEqual({
      name: 'NAME',
      type: 'text',
      required: true,
    });
  });
  
  it('should parse typed variables', () => {
    const content = 'You are {{AGE:number}} years old';
    const result = parseTemplate(content);
    
    expect(result.variables[0].type).toBe('number');
  });
  
  it('should handle optional variables', () => {
    const content = 'Hello {{NAME?}}, {{GREETING:text:Good morning}}';
    const result = parseTemplate(content);
    
    expect(result.variables[0].required).toBe(false);
    expect(result.variables[1].defaultValue).toBe('Good morning');
  });
});
```

### Extension Testing

```typescript
// tests/extension.test.ts
import { chrome } from '@extend-chrome/test';

describe('Extension Storage', () => {
  beforeEach(() => {
    chrome.reset();
  });
  
  it('should save and retrieve templates', async () => {
    const template = {
      id: '123',
      name: 'Test Template',
      content: 'Hello {{NAME}}',
      variables: [{ name: 'NAME', type: 'text', required: true }],
    };
    
    await chrome.storage.local.set({ templates: { '123': template } });
    
    const result = await chrome.storage.local.get('templates');
    expect(result.templates['123']).toEqual(template);
  });
});
```

## 7. Build & Distribution

### Build Script

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "pack": "npm run build && web-ext build -s dist -a artifacts",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        content: 'src/content/index.ts',
        background: 'src/background/service-worker.ts',
      },
    },
  },
});
```

### Installation & Distribution Options

1. **Development**: Load unpacked extension from `dist/` folder
2. **Personal Use**: Pack as `.crx` file for easy installation
3. **Team Sharing**: Private GitHub repo with releases
4. **Future**: Chrome Web Store publication

## 8. Future Enhancements (Post-MVP)

1. **Cloud Sync** (Optional)
   - GitHub Gist integration for backup
   - End-to-end encrypted sync service

2. **AI Integration**
   - Direct API calls to OpenAI/Anthropic
   - Smart variable value suggestions
   - Template generation from examples

3. **Advanced Features**
   - Template chaining/workflows
   - Conditional logic in templates
   - Import from ChatGPT conversations
   - Export to other formats

4. **Collaboration**
   - Share templates via links
   - Team template libraries
   - Version control
