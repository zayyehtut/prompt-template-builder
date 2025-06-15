import type { ParsedVariable } from '@/types/storage';

/**
 * Template parser for detecting and parsing variables in template content
 * Supports formats: {{NAME}}, {{NAME:type}}, {{NAME?}}, {{NAME:type:default}}
 */

export interface ParseResult {
  variables: ParsedVariable[];
  plainText: string;
}

/**
 * Parse template content and extract variables and plain text
 */
export function parseTemplate(content: string): ParseResult {
  const variables = new Map<string, ParsedVariable>();
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    const varDef = match[1].trim();
    
    // Handle control structures that may contain variables
    if (isControlStructure(varDef)) {
      // Extract variable from control structures like {{#IF VARIABLE:type}}
      const extracted = extractVariableFromControlStructure(varDef);
      if (extracted) {
        const parsed = parseVariableDefinition(extracted);
        variables.set(parsed.name, parsed);
      }
      continue;
    }
    
    const parsed = parseVariableDefinition(varDef);
    
    // Use the variable name as key to avoid duplicates
    variables.set(parsed.name, parsed);
  }
  
  // Extract plain text for search functionality
  const plainText = content
    .replace(variableRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    variables: Array.from(variables.values()),
    plainText,
  };
}

/**
 * Parse individual variable definition string
 * Supports: NAME, NAME:type, NAME?, NAME:type?, NAME:type:default
 */
export function parseVariableDefinition(definition: string): ParsedVariable {
  // Split by colon to get parts: [name, type, default]
  const parts = definition.split(':');
  const namePart = parts[0].trim();
  
  // Check if optional (ends with ?) - can be on name or type
  let isOptional = namePart.endsWith('?');
  const name = namePart.replace('?', '').trim().toUpperCase();
  
  // Get type (explicit or inferred)
  let explicitType = parts[1]?.trim();
  
  // Check if optional marker is on the type instead
  if (explicitType && explicitType.endsWith('?')) {
    isOptional = true;
    explicitType = explicitType.replace('?', '').trim();
  }
  
  const type = inferType(explicitType, name);
  
  // Get default value
  const defaultValueStr = parts[2]?.trim();
  const defaultValue = parseDefaultValue(defaultValueStr, type);
  
  // Variable is required if not optional and no default value
  const required = !isOptional && !defaultValue;
  
  return {
    name,
    type,
    required,
    defaultValue,
    placeholder: generatePlaceholder(name, type),
  };
}

/**
 * Infer variable type from explicit type or variable name patterns
 */
export function inferType(
  explicit: string | undefined, 
  name: string
): ParsedVariable['type'] {
  // If explicit type provided, use it
  if (explicit) {
    const typeMap: Record<string, ParsedVariable['type']> = {
      'text': 'text',
      'string': 'text',
      'str': 'text',
      'number': 'number',
      'num': 'number',
      'int': 'number',
      'integer': 'number',
      'float': 'number',
      'bool': 'boolean',
      'boolean': 'boolean',
      'date': 'date',
      'datetime': 'date',
      'time': 'date',
      'select': 'select',
      'choice': 'select',
      'option': 'select',
      'enum': 'select',
    };
    
    const mappedType = typeMap[explicit.toLowerCase()];
    if (mappedType) return mappedType;
  }
  
  // Infer from variable name patterns
  const upperName = name.toUpperCase();
  
  // Boolean patterns
  if (/^(IS_|HAS_|SHOULD_|CAN_|WILL_|ENABLE_|DISABLE_|ALLOW_)/.test(upperName)) {
    return 'boolean';
  }
  
  // Date patterns
  if (/_(DATE|TIME|WHEN|CREATED|UPDATED|EXPIRES)(_|$)/.test(upperName)) {
    return 'date';
  }
  
  // Number patterns
  if (/_(COUNT|NUMBER|AMOUNT|QUANTITY|PRICE|COST|AGE|YEAR|SIZE|LENGTH|WIDTH|HEIGHT)(_|$)/.test(upperName)) {
    return 'number';
  }
  
  // Select patterns
  if (/_(TYPE|STATUS|CATEGORY|OPTION|MODE|LEVEL|PRIORITY|STATE)(_|$)/.test(upperName)) {
    return 'select';
  }
  
  // Default to text
  return 'text';
}

/**
 * Parse default value string based on variable type
 */
export function parseDefaultValue(
  defaultStr: string | undefined, 
  type: ParsedVariable['type']
): unknown {
  if (!defaultStr) return undefined;
  
  switch (type) {
    case 'boolean':
      const lowerValue = defaultStr.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) return true;
      if (['false', '0', 'no', 'off'].includes(lowerValue)) return false;
      return undefined;
      
    case 'number':
      const num = parseFloat(defaultStr);
      return isNaN(num) ? undefined : num;
      
    case 'date':
      const date = new Date(defaultStr);
      return isNaN(date.getTime()) ? undefined : date;
      
    case 'select':
    case 'text':
    default:
      return defaultStr;
  }
}

/**
 * Generate user-friendly placeholder text for variables
 */
export function generatePlaceholder(
  name: string, 
  type: ParsedVariable['type']
): string {
  const friendlyName = name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  switch (type) {
    case 'boolean':
      return `${friendlyName} (Yes/No)`;
    case 'number':
      return `Enter ${friendlyName.toLowerCase()}`;
    case 'date':
      return `Select ${friendlyName.toLowerCase()}`;
    case 'select':
      return `Choose ${friendlyName.toLowerCase()}`;
    case 'text':
    default:
      return `Enter ${friendlyName.toLowerCase()}`;
  }
}

/**
 * Validate template syntax and return any errors
 */
export function validateTemplate(content: string): string[] {
  const errors: string[] = [];
  const variableRegex = /\{\{([^}]*)\}\}/g;
  
  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    const varDef = match[1].trim();
    
    // Check for empty variable
    if (!varDef) {
      errors.push(`Empty variable at position ${match.index}`);
      continue;
    }
    
    // Check for valid variable name
    const parts = varDef.split(':');
    const namePart = parts[0].replace('?', '').trim();
    
    if (!namePart) {
      errors.push(`Invalid variable name: ${varDef}`);
      continue;
    }
    
    // Check for valid variable name format (letters, numbers, underscores only)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(namePart)) {
      errors.push(`Invalid variable name format: ${namePart}`);
    }
    
    // Check for too many parts
    if (parts.length > 3) {
      errors.push(`Too many parts in variable definition: ${varDef}`);
    }
  }
  
  // Check for unclosed variables
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('Mismatched variable braces - check for unclosed {{}} pairs');
  }
  
  return errors;
}

/**
 * Get all unique variable names from template content
 */
export function extractVariableNames(content: string): string[] {
  const { variables } = parseTemplate(content);
  return variables.map(v => v.name);
}

/**
 * Check if template contains any variables
 */
export function hasVariables(content: string): boolean {
  return /\{\{[^}]+\}\}/.test(content);
}

/**
 * Check if a variable definition is actually a control structure
 */
function isControlStructure(varDef: string): boolean {
  const controlPatterns = [
    /^#IF\b/i,      // {{#IF condition}}
    /^\/IF$/i,      // {{/IF}}
    /^#EACH\b/i,    // {{#EACH items}}
    /^\/EACH$/i,    // {{/EACH}}
    /^#UNLESS\b/i,  // {{#UNLESS condition}}
    /^\/UNLESS$/i,  // {{/UNLESS}}
    /^#WITH\b/i,    // {{#WITH object}}
    /^\/WITH$/i,    // {{/WITH}}
  ];
  
  return controlPatterns.some(pattern => pattern.test(varDef));
}

/**
 * Extract variable definition from control structures
 * e.g., "IF VARIABLE:boolean" -> "VARIABLE:boolean"
 */
function extractVariableFromControlStructure(varDef: string): string | null {
  // Handle {{#IF VARIABLE}} or {{#IF VARIABLE:type}}
  const ifMatch = varDef.match(/^#IF\s+(.+)$/i);
  if (ifMatch) {
    return ifMatch[1].trim();
  }
  
  // Handle {{#UNLESS VARIABLE}} or {{#UNLESS VARIABLE:type}}
  const unlessMatch = varDef.match(/^#UNLESS\s+(.+)$/i);
  if (unlessMatch) {
    return unlessMatch[1].trim();
  }
  
  // Handle {{#EACH VARIABLE}} (though less common for typed variables)
  const eachMatch = varDef.match(/^#EACH\s+(.+)$/i);
  if (eachMatch) {
    return eachMatch[1].trim();
  }
  
  // Control structures without variables (like {{/IF}})
  return null;
} 