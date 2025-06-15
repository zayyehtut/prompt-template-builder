# Technical Specification Document (TSD) - Template Management Page Architecture

**Purpose:** Browser extension with dedicated template management page for professional prompt template workflow

**Vision:** Clean, developer-focused interface with powerful UX features for efficient prompt creation and management

## 1. System Architecture Overview

### Architecture Pattern: Extension + Dedicated Management Page

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser Extension                             │
├─────────────────────────┬───────────────────────┬──────────────────┤
│   Popup UI              │   Content Script      │  Background      │
│   - Quick Access        │   - Text Selection    │  Service Worker  │
│   - Recent Templates    │   - Context Menu      │  - Storage Sync  │
│   - Open Manager        │   - Quick Insert      │  - Page Manager  │
└───────────┬─────────────┴──────────┬────────────┴──────────┬───────┘
            │                        │                         │
            ▼                        ▼                         ▼
┌───────────────────────────────────────────────────────────────────┐
│                Template Management Page (Full Control)             │
├─────────────────────────┬───────────────────────┬────────────────┤
│  Notion-Style Editor    │  Template Library     │  Smart Features │
│  - Rich Text Editor     │  - Categories & Tags  │  - Text→Variable │
│  - Syntax Highlighting │  - Search & Filter    │  - Auto-complete │
│  - Variable Detection  │  - Import/Export      │  - Quick Actions │
│  - Live Preview        │  - Usage Analytics    │  - Keyboard Nav  │
└─────────────────────────┴───────────────────────┴────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Browser Storage & Sync                          │
├─────────────────────────┬───────────────────────┬────────────────┤
│  chrome.storage.local   │  chrome.storage.sync  │   IndexedDB    │
│  - Templates & Content  │  - Settings & Prefs   │   - History     │
│  - Variables & Presets  │  - Theme & Layout     │   - Analytics   │
└─────────────────────────┴───────────────────────┴────────────────┘
```

### Key Design Principles:

1. **Dedicated Workspace**: Full-page template management for complete control
2. **Clean Developer Aesthetics**: Professional themes with excellent readability
3. **Instant UX**: Text highlighting → variable conversion in one action
4. **Keyboard-First**: Complete keyboard navigation and shortcuts
5. **Zero Friction**: Paste raw prompt → highlight → convert → save workflow
6. **Performance First**: Lightweight, fast, responsive interface

## 2. Technology Stack

### Core Stack
- **Extension**: Manifest V3, TypeScript 5.0+
- **Management Page**: React 18+ with Vite 5.0+
- **Editor**: Monaco Editor (VS Code editor) for professional feel
- **Styling**: Tailwind CSS + Custom CSS Variables for themes
- **State**: Zustand for extension, React Query for data management
- **UI Components**: Headless UI + Custom components

### Page-Specific Features
- **Rich Text Editor**: Monaco with custom prompt template language
- **Theme System**: Clean light/dark themes with developer color schemes
- **Layout Manager**: Resizable panels, customizable workspace
- **Command Palette**: VS Code-style command palette (Cmd+K)

## 3. UX Flow Innovations

### Primary Workflow: Paste → Highlight → Convert

```typescript
// User Journey: From Raw Prompt to Template
1. User pastes raw prompt into editor
2. Editor highlights potential variables automatically
3. User selects text spans to convert to variables
4. Smart variable type detection based on content
5. One-click save with auto-generated name
6. Instant availability in popup and context menus
```

### Smart Text Selection Features

```typescript
interface TextSelectionFeatures {
  // Highlight text → Convert to variable
  highlightToVariable: {
    detection: 'automatic' | 'manual';
    suggestType: boolean;
    suggestName: boolean;
    showPreview: boolean;
  };
  
  // Smart patterns recognition
  patternRecognition: {
    emails: boolean;
    urls: boolean;
    names: boolean;
    dates: boolean;
    numbers: boolean;
  };
  
  // Batch operations
  batchConversion: {
    multiSelect: boolean;
    bulkRename: boolean;
    typeInference: boolean;
  };
}
```

### Template Creation Workflow

1. **Quick Start**: Paste any text and start highlighting
2. **Smart Detection**: AI-powered variable suggestion
3. **Visual Feedback**: Real-time preview of template output
4. **Category Auto-Assignment**: Based on content analysis
5. **Tag Generation**: Automatic tagging from content

## 4. Management Page Architecture

### Main Layout Components

```typescript
// Template Management Page Structure
interface ManagementPageLayout {
  // Top Navigation Bar
  navbar: {
    logo: string;
    searchBar: boolean;
    userActions: string[];
    themeToggle: boolean;
  };
  
  // Left Sidebar - Library
  sidebar: {
    categories: Category[];
    recentTemplates: Template[];
    favorites: Template[];
    quickActions: Action[];
    width: 'resizable';
  };
  
  // Main Editor Area
  editor: {
    type: 'monaco' | 'codemirror';
    features: ['syntax-highlight', 'autocomplete', 'variable-detection'];
    toolbar: ['save', 'preview', 'export', 'settings'];
    splitView: boolean;
  };
  
  // Right Panel - Properties
  properties: {
    templateMeta: boolean;
    variableEditor: boolean;
    previewPanel: boolean;
    usageStats: boolean;
  };
}
```

### Editor Features

```typescript
// Monaco Editor Configuration
const editorConfig = {
  language: 'prompt-template', // Custom language
  theme: 'prompt-dark' | 'prompt-light',
  features: {
    // Variable highlighting
    variableHighlighting: {
      color: '#FFB800',
      style: 'underline-dotted',
      hover: 'show-type-info',
    },
    
    // Auto-completion
    autoComplete: {
      variables: true,
      functions: true,
      snippets: true,
      contextAware: true,
    },
    
    // Live preview
    livePreview: {
      enabled: true,
      position: 'right-panel',
      updateDelay: 300,
    },
    
    // Text selection to variable
    selectionToVariable: {
      hotkey: 'Cmd+Shift+V',
      showModal: true,
      suggestName: true,
      suggestType: true,
    },
  },
};
```

## 5. Theme System

### Developer-Focused Themes

```css
/* Light Theme - Clean Developer */
:root[data-theme="light"] {
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-elevated: #ffffff;
  
  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  
  /* Accent Colors */
  --accent-primary: #3b82f6;
  --accent-secondary: #6366f1;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;
  
  /* Variable Colors */
  --variable-bg: #fef3c7;
  --variable-border: #f59e0b;
  --variable-text: #92400e;
  
  /* Editor Colors */
  --editor-bg: #ffffff;
  --editor-selection: #e0e7ff;
  --editor-line-number: #9ca3af;
  --editor-cursor: #3b82f6;
}

/* Dark Theme - Professional Developer */
:root[data-theme="dark"] {
  /* Background Colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --bg-elevated: #1e293b;
  
  /* Text Colors */
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --text-muted: #64748b;
  
  /* Accent Colors */
  --accent-primary: #60a5fa;
  --accent-secondary: #818cf8;
  --accent-success: #34d399;
  --accent-warning: #fbbf24;
  --accent-danger: #f87171;
  
  /* Variable Colors */
  --variable-bg: #422006;
  --variable-border: #d97706;
  --variable-text: #fbbf24;
  
  /* Editor Colors */
  --editor-bg: #0f172a;
  --editor-selection: #312e81;
  --editor-line-number: #6b7280;
  --editor-cursor: #60a5fa;
}
```

## 6. Smart UX Features

### Text-to-Variable Conversion

```typescript
// Smart Selection Handler
class SmartSelectionHandler {
  convertSelectionToVariable(selectedText: string): VariableCandidate {
    const candidate: VariableCandidate = {
      originalText: selectedText,
      suggestedName: this.generateVariableName(selectedText),
      suggestedType: this.inferType(selectedText),
      confidence: this.calculateConfidence(selectedText),
      examples: this.generateExamples(selectedText),
    };
    
    return candidate;
  }
  
  private generateVariableName(text: string): string {
    // Smart naming based on context
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
      company: /\b[A-Z][a-zA-Z\s]+(?:Inc|LLC|Corp|Ltd)\b/,
      date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return type.toUpperCase();
      }
    }
    
    // Fallback to content-based naming
    return text.slice(0, 20).toUpperCase().replace(/\s+/g, '_');
  }
}
```

### Keyboard Navigation

```typescript
// Keyboard Shortcuts Configuration
const keyboardShortcuts = {
  // Global shortcuts
  'Cmd+K': 'openCommandPalette',
  'Cmd+P': 'quickOpenTemplate',
  'Cmd+N': 'newTemplate',
  'Cmd+S': 'saveTemplate',
  'Cmd+/': 'toggleComments',
  
  // Editor shortcuts
  'Cmd+Shift+V': 'convertSelectionToVariable',
  'Cmd+D': 'duplicateSelection',
  'Alt+Click': 'multiCursor',
  'Cmd+Shift+L': 'selectAllOccurrences',
  
  // Navigation shortcuts
  'Cmd+B': 'toggleSidebar',
  'Cmd+Shift+E': 'focusExplorer',
  'Cmd+1': 'focusEditor',
  'Cmd+2': 'focusPreview',
  'Cmd+3': 'focusProperties',
  
  // Template shortcuts
  'Cmd+R': 'runTemplate',
  'Cmd+Shift+C': 'copyTemplateOutput',
  'Cmd+Enter': 'saveAndRun',
};
```

## 7. Template Library Management

### Smart Organization

```typescript
interface TemplateLibrary {
  // Automatic categorization
  categories: {
    autoDetect: boolean;
    suggestions: string[];
    customCategories: Category[];
  };
  
  // Search and filtering
  search: {
    fullTextSearch: boolean;
    variableSearch: boolean;
    tagSearch: boolean;
    usageSearch: boolean;
    fuzzyMatching: boolean;
  };
  
  // Bulk operations
  bulkOperations: {
    export: 'json' | 'csv' | 'yaml';
    import: 'drag-drop' | 'file-picker';
    merge: boolean;
    duplicate: boolean;
  };
  
  // Analytics
  analytics: {
    usageFrequency: boolean;
    popularVariables: boolean;
    performanceMetrics: boolean;
    exportReports: boolean;
  };
}
```

## 8. Extension Integration

### Popup Enhancement

```typescript
// Simplified Popup for Quick Access
interface PopupInterface {
  layout: 'compact' | 'minimal';
  features: {
    recentTemplates: Template[];
    favoriteTemplates: Template[];
    quickSearch: boolean;
    openManagerButton: boolean;
    contextActions: Action[];
  };
  
  interactions: {
    openManager: 'click' | 'keyboard';
    quickExecute: boolean;
    clipboardIntegration: boolean;
  };
}
```

### Content Script Integration

```typescript
// Enhanced Content Script for Better UX
class ContentScriptManager {
  features = {
    // Quick template insertion
    quickInsert: {
      hotkey: 'Cmd+Shift+Space',
      showPalette: true,
      fuzzySearch: true,
    },
    
    // Context-aware suggestions
    contextSuggestions: {
      detectInputType: true,
      suggestRelevant: true,
      showInline: boolean,
    },
    
    // Selection enhancement
    selectionTools: {
      extractToTemplate: true,
      improvePrompt: true,
      generateVariables: true,
    },
  };
}
```

## 9. Implementation Phases

### Phase 1: Core Management Page (MVP+)
- Monaco editor integration
- Basic theme system
- Template CRUD operations
- Simple text-to-variable conversion

### Phase 2: UX Enhancements
- Advanced selection tools
- Smart variable detection
- Command palette
- Keyboard navigation

### Phase 3: Professional Features
- Advanced theming
- Analytics dashboard
- Import/export tools
- Performance optimization

### Phase 4: Advanced Integrations
- AI-powered suggestions
- Template sharing
- Version control
- Collaboration tools

## 10. Technical Requirements

### Performance Targets
- Page load time: < 200ms
- Editor response time: < 50ms
- Search results: < 100ms
- Theme switching: < 30ms

### Browser Compatibility
- Chrome 100+
- Edge 100+
- Firefox 100+ (future)
- Safari 15+ (future)

### Storage Limits
- Templates: Unlimited (local storage)
- Settings: 100KB (sync storage)
- History: 10MB (IndexedDB)

---

**Next Steps:** Implement the dedicated template management page with clean developer themes and Notion-style editing experience for efficient prompt template creation and management.