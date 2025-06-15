import type { InterpolationOptions } from '@/types/storage';

/**
 * Basic template interpolation - replaces variables with values
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>,
  options: InterpolationOptions = {}
): string {
  const { 
    throwOnMissing = false,
    highlightMissing = true,
    transformers = {}
  } = options;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, varDef) => {
    // Skip control structures
    if (/^(#IF|\/IF|#UNLESS|\/UNLESS|#EACH|\/EACH|#WITH|\/WITH)\b/i.test(varDef.trim())) {
      return match; // Return unchanged for control structures
    }
    
    // Parse variable definition (handle optional and typed variables)
    const parts = varDef.split(':');
    const namePart = parts[0].trim();
    const isOptional = namePart.endsWith('?');
    let name = namePart.replace('?', '').trim().toUpperCase();
    
    // Handle object property access (e.g., ITEM.name)
    let value = variables[name];
    if (name.includes('.')) {
      const propertyPath = name.split('.');
      value = variables[propertyPath[0]];
      for (let i = 1; i < propertyPath.length && value != null; i++) {
        value = (value as Record<string, unknown>)[propertyPath[i].toLowerCase()];
      }
      // Use the full path as the name for transformers
      name = propertyPath.join('.');
    }
    
    // Check if variable exists (but allow null and undefined as valid values)
    const hasVariable = name.includes('.') ? value !== undefined : (name in variables);
    
    if (!hasVariable) {
      // Handle optional variables
      if (isOptional) {
        return '';
      }
      
      // Handle missing required variables
      if (throwOnMissing) {
        throw new Error(`Missing required variable: ${name}`);
      }
      if (highlightMissing) {
        return `[MISSING: ${name}]`;
      }
      return match; // Return original if not highlighting
    }
    
    // Apply custom transformers
    if (transformers[name]) {
      value = transformers[name](value);
    }
    
    // Format based on type and value (rejoin type parts if there are multiple colons)
    const typeHint = parts.length > 1 ? parts.slice(1).join(':').trim() : undefined;
    return formatValue(value, typeHint);
  });
}

/**
 * Advanced template interpolation with conditionals and loops
 */
export function interpolateAdvanced(
  template: string,
  variables: Record<string, unknown>,
  options: InterpolationOptions = {}
): string {
  let result = template;
  
  // Process blocks in order: EACH, WITH, IF, UNLESS (EACH first to set loop variables)
  result = processBlocks(result, 'EACH', variables, options);
  result = processBlocks(result, 'WITH', variables, options);
  result = processBlocks(result, 'IF', variables, options);
  result = processBlocks(result, 'UNLESS', variables, options);
  
  // Finally, process regular variables
  return interpolateTemplate(result, variables, options);
}

/**
 * Process template blocks with proper nesting support
 */
function processBlocks(
  template: string,
  blockType: string,
  variables: Record<string, unknown>,
  options: InterpolationOptions
): string {
  const openPattern = new RegExp(`\\{\\{#${blockType}\\s+([^}]+)\\}\\}`, 'g');
  const closeTag = `{{/${blockType}}}`;
  
  let result = template;
  let changed = true;
  
  // Keep processing until no more blocks are found (handles nesting)
  while (changed) {
    changed = false;
    openPattern.lastIndex = 0; // Reset regex
    const openMatch = openPattern.exec(result);
    
    if (!openMatch) break;
    
    const openIndex = openMatch.index;
    const condition = openMatch[1];
    
    // Find the matching close tag
    let depth = 0;
    let closeIndex = -1;
    let searchStart = openIndex + openMatch[0].length;
    
    while (searchStart < result.length) {
      const nextOpenMatch = new RegExp(`\\{\\{#${blockType}\\s+[^}]+\\}\\}`, 'g');
      nextOpenMatch.lastIndex = searchStart;
      const nextOpenResult = nextOpenMatch.exec(result);
      const nextOpen = nextOpenResult ? nextOpenResult.index : -1;
      
      const nextClose = result.indexOf(closeTag, searchStart);
      
      if (nextClose === -1) break; // No more close tags
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Found another open tag before close
        depth++;
        searchStart = nextOpen + nextOpenResult![0].length;
      } else {
        // Found a close tag
        if (depth === 0) {
          closeIndex = nextClose;
          break;
        } else {
          depth--;
          searchStart = nextClose + closeTag.length;
        }
      }
    }
    
    if (closeIndex === -1) break; // No matching close tag found
    
    // Extract the block content
    const headerEnd = openIndex + openMatch[0].length;
    const content = result.substring(headerEnd, closeIndex);
    
    // Process the block based on type
    let replacement = '';
    
    if (blockType === 'IF') {
      if (evaluateCondition(condition, variables)) {
        replacement = interpolateAdvanced(content, variables, options);
      }
    } else if (blockType === 'UNLESS') {
      if (!evaluateCondition(condition, variables)) {
        replacement = interpolateAdvanced(content, variables, options);
      }
    } else if (blockType === 'EACH') {
      const items = variables[condition.trim().toUpperCase()];
      if (Array.isArray(items)) {
        replacement = items.map((item, index) => {
          const itemVars = {
            ...variables,
            ITEM: item,
            INDEX: index,
            FIRST: index === 0,
            LAST: index === items.length - 1,
          };
          return interpolateAdvanced(content, itemVars, options);
        }).join('');
      }
    } else if (blockType === 'WITH') {
      const obj = variables[condition.trim().toUpperCase()];
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const withVars = {
          ...variables,
          ...(obj as Record<string, unknown>),
        };
        replacement = interpolateAdvanced(content, withVars, options);
      }
    }
    
    // Replace the block with the processed content
    result = result.substring(0, openIndex) + replacement + result.substring(closeIndex + closeTag.length);
    changed = true;
  }
  
  return result;
}

/**
 * Format a value based on its type and optional type hint
 */
function formatValue(value: unknown, typeHint?: string): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    if (typeHint === 'yesno') return value ? 'Yes' : 'No';
    if (typeHint === 'truefalse') return value ? 'True' : 'False';
    if (typeHint === 'onoff') return value ? 'On' : 'Off';
    return value ? 'Yes' : 'No'; // Default boolean formatting
  }
  
  // Handle dates
  if (value instanceof Date) {
    if (typeHint === 'iso') return value.toISOString();
    if (typeHint === 'time') return value.toLocaleTimeString();
    if (typeHint === 'datetime') return value.toLocaleString();
    return value.toLocaleDateString(); // Default date formatting
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    if (typeHint === 'currency') return `$${value.toFixed(2)}`;
    if (typeHint === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (typeHint === 'integer') return Math.round(value).toString();
    if (typeHint?.startsWith('fixed:')) {
      const decimals = parseInt(typeHint.split(':')[1]) || 2;
      return value.toFixed(decimals);
    }
    return value.toString();
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (typeHint === 'count') return value.length.toString();
    if (typeHint === 'join') return value.join(', ');
    if (typeHint?.startsWith('join:')) {
      const separator = typeHint.slice(5); // Get everything after 'join:'
      return value.join(separator);
    }
    return value.join(', '); // Default array formatting
  }
  
  // Handle objects
  if (typeof value === 'object') {
    if (typeHint === 'json') return JSON.stringify(value, null, 2);
    if (typeHint === 'keys') return Object.keys(value).join(', ');
    return '[Object]'; // Default object formatting
  }
  
  // Default: convert to string
  return String(value);
}

/**
 * Evaluate a condition for IF/UNLESS blocks
 */
function evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
  const trimmed = condition.trim();
  
  // Handle simple variable existence checks
  if (/^[A-Za-z_][A-Za-z0-9_]*\??$/.test(trimmed)) {
    const varName = trimmed.replace('?', '').toUpperCase();
    const value = variables[varName];
    
    // Truthy check
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.length > 0;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'boolean') return value;
    return value != null;
  }
  
  // Handle comparison operations
  const comparisonMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
  if (comparisonMatch) {
    const [, varName, operator, valueStr] = comparisonMatch;
    const leftValue = variables[varName.toUpperCase()];
    const rightValue = parseComparisonValue(valueStr.trim());
    
    switch (operator) {
      case '==': return leftValue == rightValue;
      case '!=': return leftValue != rightValue;
      case '>': return Number(leftValue) > Number(rightValue);
      case '<': return Number(leftValue) < Number(rightValue);
      case '>=': return Number(leftValue) >= Number(rightValue);
      case '<=': return Number(leftValue) <= Number(rightValue);
      default: return false;
    }
  }
  
  // Handle logical operations (AND, OR)
  if (trimmed.includes(' AND ')) {
    return trimmed.split(' AND ').every(part => 
      evaluateCondition(part.trim(), variables)
    );
  }
  
  if (trimmed.includes(' OR ')) {
    return trimmed.split(' OR ').some(part => 
      evaluateCondition(part.trim(), variables)
    );
  }
  
  // Handle negation
  if (trimmed.startsWith('NOT ')) {
    return !evaluateCondition(trimmed.slice(4), variables);
  }
  
  // Default: false for unrecognized conditions
  return false;
}

/**
 * Parse a value for comparison operations
 */
function parseComparisonValue(valueStr: string): unknown {
  // Remove quotes if present
  if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
    return valueStr.slice(1, -1);
  }
  
  // Parse numbers
  if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
    return parseFloat(valueStr);
  }
  
  // Parse booleans
  if (valueStr.toLowerCase() === 'true') return true;
  if (valueStr.toLowerCase() === 'false') return false;
  
  // Parse null/undefined
  if (valueStr.toLowerCase() === 'null') return null;
  if (valueStr.toLowerCase() === 'undefined') return undefined;
  
  // Default: return as string
  return valueStr;
}

/**
 * Escape template syntax in a string
 */
export function escapeTemplate(text: string): string {
  return text.replace(/\{\{/g, '\\{\\{').replace(/\}\}/g, '\\}\\}');
}

/**
 * Unescape template syntax in a string
 */
export function unescapeTemplate(text: string): string {
  return text.replace(/\\{\\{/g, '{{').replace(/\\}\\}/g, '}}');
}

/**
 * Check if a template has any unresolved variables
 */
export function hasUnresolvedVariables(template: string): boolean {
  return /\{\{[^}]+\}\}/.test(template);
}

/**
 * Get all unresolved variable names from a template
 */
export function getUnresolvedVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map(match => {
    const varDef = match.slice(2, -2).trim();
    const parts = varDef.split(':');
    return parts[0].replace('?', '').trim().toUpperCase();
  }).filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  template: string,
  variables: Record<string, unknown>
): { valid: boolean; missing: string[]; errors: string[] } {
  const errors: string[] = [];
  const missing: string[] = [];
  
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = variableRegex.exec(template)) !== null) {
    const varDef = match[1].trim();
    
    // Skip control structures
    if (/^(#IF|\/IF|#UNLESS|\/UNLESS|#EACH|\/EACH|#WITH|\/WITH)\b/i.test(varDef)) {
      continue;
    }
    
    const parts = varDef.split(':');
    const namePart = parts[0].trim();
    const isOptional = namePart.endsWith('?');
    const name = namePart.replace('?', '').trim().toUpperCase();
    
    // Check if required variable is missing
    if (!isOptional && !(name in variables)) {
      missing.push(name);
    }
    
    // Validate variable name format
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      errors.push(`Invalid variable name: ${name}`);
    }
  }
  
  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
} 