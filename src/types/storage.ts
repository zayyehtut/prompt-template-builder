// Storage schema types for the browser extension
export interface StorageSchema {
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

export interface Template {
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

export interface Variable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  defaultValue?: any;
  options?: string[]; // for select type
  required: boolean;
  description?: string;
}

export interface VariablePreset {
  id: string;
  name: string;
  values: Record<string, any>;
  isDefault: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultCategory: string;
  enableShortcuts: boolean;
  autoClose: boolean;
  syncEnabled: boolean;
  aiProvider?: 'openai' | 'claude' | 'none';
  aiApiKey?: string; // Encrypted
}

export interface ExecutionRecord {
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

// Interpolation options
export interface InterpolationOptions {
  throwOnMissing?: boolean;
  highlightMissing?: boolean;
  transformers?: Record<string, (value: any) => any>;
}

// Parsed variable definition
export interface ParsedVariable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
} 