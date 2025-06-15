export interface Variable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description?: string;
  placeholder?: string;
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
  description?: string;
  hotkey?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface TemplateExecutionContext {
  selectedText?: string;
  url?: string;
  title?: string;
}

export interface VariablePreset {
  id: string;
  name: string;
  values: Record<string, any>;
  isDefault: boolean;
}

export interface ExecutionRecord {
  id: string;
  templateId: string;
  templateName: string;
  variables: Record<string, any>;
  output: string;
  executedAt: number;
  context?: TemplateExecutionContext;
}

export interface ManagerContext {
  action: 'new-template';
  selectedText?: string;
} 