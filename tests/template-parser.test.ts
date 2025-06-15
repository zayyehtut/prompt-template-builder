import { describe, it, expect } from 'vitest';
import {
  parseTemplate,
  parseVariableDefinition,
  inferType,
  parseDefaultValue,
  generatePlaceholder,
  validateTemplate,
  extractVariableNames,
  hasVariables,
} from '@/lib/template-parser';

describe('Template Parser', () => {
  describe('parseTemplate', () => {
    it('should parse simple variables', () => {
      const content = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const result = parseTemplate(content);
      
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0]).toEqual({
        name: 'NAME',
        type: 'text',
        required: true,
        defaultValue: undefined,
        placeholder: 'Enter name',
      });
      expect(result.variables[1]).toEqual({
        name: 'PLACE',
        type: 'text',
        required: true,
        defaultValue: undefined,
        placeholder: 'Enter place',
      });
    });

    it('should extract plain text for search', () => {
      const content = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const result = parseTemplate(content);
      
      expect(result.plainText).toBe('Hello , welcome to !');
    });

    it('should handle duplicate variables', () => {
      const content = 'Hello {{NAME}}! Nice to meet you, {{NAME}}.';
      const result = parseTemplate(content);
      
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe('NAME');
    });

    it('should handle empty content', () => {
      const result = parseTemplate('');
      expect(result.variables).toHaveLength(0);
      expect(result.plainText).toBe('');
    });

    it('should handle content without variables', () => {
      const content = 'This is just plain text.';
      const result = parseTemplate(content);
      
      expect(result.variables).toHaveLength(0);
      expect(result.plainText).toBe(content);
    });
  });

  describe('parseVariableDefinition', () => {
    it('should parse simple variable names', () => {
      const result = parseVariableDefinition('NAME');
      expect(result).toEqual({
        name: 'NAME',
        type: 'text',
        required: true,
        defaultValue: undefined,
        placeholder: 'Enter name',
      });
    });

    it('should parse typed variables', () => {
      const result = parseVariableDefinition('AGE:number');
      expect(result).toEqual({
        name: 'AGE',
        type: 'number',
        required: true,
        defaultValue: undefined,
        placeholder: 'Enter age',
      });
    });

    it('should parse optional variables', () => {
      const result = parseVariableDefinition('NICKNAME?');
      expect(result).toEqual({
        name: 'NICKNAME',
        type: 'text',
        required: false,
        defaultValue: undefined,
        placeholder: 'Enter nickname',
      });
    });

    it('should parse variables with default values', () => {
      const result = parseVariableDefinition('GREETING:text:Hello');
      expect(result).toEqual({
        name: 'GREETING',
        type: 'text',
        required: false,
        defaultValue: 'Hello',
        placeholder: 'Enter greeting',
      });
    });

    it('should parse optional typed variables', () => {
      const result = parseVariableDefinition('SCORE:number?');
      expect(result).toEqual({
        name: 'SCORE',
        type: 'number',
        required: false,
        defaultValue: undefined,
        placeholder: 'Enter score',
      });
    });

    it('should handle whitespace in definitions', () => {
      const result = parseVariableDefinition('  NAME : text : John  ');
      expect(result).toEqual({
        name: 'NAME',
        type: 'text',
        required: false,
        defaultValue: 'John',
        placeholder: 'Enter name',
      });
    });
  });

  describe('inferType', () => {
    it('should use explicit types when provided', () => {
      expect(inferType('text', 'ANYTHING')).toBe('text');
      expect(inferType('number', 'ANYTHING')).toBe('number');
      expect(inferType('boolean', 'ANYTHING')).toBe('boolean');
      expect(inferType('date', 'ANYTHING')).toBe('date');
      expect(inferType('select', 'ANYTHING')).toBe('select');
    });

    it('should handle type aliases', () => {
      expect(inferType('string', 'NAME')).toBe('text');
      expect(inferType('str', 'NAME')).toBe('text');
      expect(inferType('int', 'COUNT')).toBe('number');
      expect(inferType('bool', 'FLAG')).toBe('boolean');
      expect(inferType('choice', 'OPTION')).toBe('select');
    });

    it('should infer boolean from name patterns', () => {
      expect(inferType(undefined, 'IS_ACTIVE')).toBe('boolean');
      expect(inferType(undefined, 'HAS_PERMISSION')).toBe('boolean');
      expect(inferType(undefined, 'SHOULD_CONTINUE')).toBe('boolean');
      expect(inferType(undefined, 'ENABLE_FEATURE')).toBe('boolean');
    });

    it('should infer date from name patterns', () => {
      expect(inferType(undefined, 'CREATED_DATE')).toBe('date');
      expect(inferType(undefined, 'UPDATE_TIME')).toBe('date');
      expect(inferType(undefined, 'EXPIRES_WHEN')).toBe('date');
    });

    it('should infer number from name patterns', () => {
      expect(inferType(undefined, 'USER_COUNT')).toBe('number');
      expect(inferType(undefined, 'TOTAL_AMOUNT')).toBe('number');
      expect(inferType(undefined, 'ITEM_PRICE')).toBe('number');
      expect(inferType(undefined, 'USER_AGE')).toBe('number');
    });

    it('should infer select from name patterns', () => {
      expect(inferType(undefined, 'USER_TYPE')).toBe('select');
      expect(inferType(undefined, 'ORDER_STATUS')).toBe('select');
      expect(inferType(undefined, 'ITEM_CATEGORY')).toBe('select');
      expect(inferType(undefined, 'PRIORITY_LEVEL')).toBe('select');
    });

    it('should default to text', () => {
      expect(inferType(undefined, 'RANDOM_NAME')).toBe('text');
      expect(inferType(undefined, 'DESCRIPTION')).toBe('text');
      expect(inferType('unknown_type', 'NAME')).toBe('text');
    });
  });

  describe('parseDefaultValue', () => {
    it('should parse boolean values', () => {
      expect(parseDefaultValue('true', 'boolean')).toBe(true);
      expect(parseDefaultValue('false', 'boolean')).toBe(false);
      expect(parseDefaultValue('1', 'boolean')).toBe(true);
      expect(parseDefaultValue('0', 'boolean')).toBe(false);
      expect(parseDefaultValue('yes', 'boolean')).toBe(true);
      expect(parseDefaultValue('no', 'boolean')).toBe(false);
      expect(parseDefaultValue('invalid', 'boolean')).toBeUndefined();
    });

    it('should parse number values', () => {
      expect(parseDefaultValue('42', 'number')).toBe(42);
      expect(parseDefaultValue('3.14', 'number')).toBe(3.14);
      expect(parseDefaultValue('-5', 'number')).toBe(-5);
      expect(parseDefaultValue('not_a_number', 'number')).toBeUndefined();
    });

    it('should parse date values', () => {
      const validDate = parseDefaultValue('2023-01-01', 'date');
      expect(validDate).toBeInstanceOf(Date);
      expect(validDate?.getFullYear()).toBe(2023);
      
      const invalidDate = parseDefaultValue('invalid_date', 'date');
      expect(invalidDate).toBeUndefined();
    });

    it('should return string values for text and select', () => {
      expect(parseDefaultValue('Hello', 'text')).toBe('Hello');
      expect(parseDefaultValue('Option1', 'select')).toBe('Option1');
    });

    it('should handle undefined default values', () => {
      expect(parseDefaultValue(undefined, 'text')).toBeUndefined();
    });
  });

  describe('generatePlaceholder', () => {
    it('should generate user-friendly placeholders', () => {
      expect(generatePlaceholder('USER_NAME', 'text')).toBe('Enter user name');
      expect(generatePlaceholder('TOTAL_COUNT', 'number')).toBe('Enter total count');
      expect(generatePlaceholder('IS_ACTIVE', 'boolean')).toBe('Is Active (Yes/No)');
      expect(generatePlaceholder('DUE_DATE', 'date')).toBe('Select due date');
      expect(generatePlaceholder('USER_TYPE', 'select')).toBe('Choose user type');
    });

    it('should handle single word names', () => {
      expect(generatePlaceholder('NAME', 'text')).toBe('Enter name');
      expect(generatePlaceholder('COUNT', 'number')).toBe('Enter count');
    });
  });

  describe('validateTemplate', () => {
    it('should return no errors for valid templates', () => {
      const errors = validateTemplate('Hello {{NAME}}, you are {{AGE:number}} years old.');
      expect(errors).toHaveLength(0);
    });

    it('should detect empty variables', () => {
      const errors = validateTemplate('Hello {{}}, how are you?');
      expect(errors).toContain('Empty variable at position 6');
    });

    it('should detect invalid variable names', () => {
      const errors = validateTemplate('Hello {{123INVALID}}, how are you?');
      expect(errors).toContain('Invalid variable name format: 123INVALID');
    });

    it('should detect too many parts in variable definition', () => {
      const errors = validateTemplate('Hello {{NAME:text:default:extra}}, how are you?');
      expect(errors).toContain('Too many parts in variable definition: NAME:text:default:extra');
    });

    it('should detect mismatched braces', () => {
      const errors = validateTemplate('Hello {{NAME}, how are you?');
      expect(errors).toContain('Mismatched variable braces - check for unclosed {{}} pairs');
    });

    it('should detect multiple validation errors', () => {
      const errors = validateTemplate('Hello {{}} and {{123INVALID}} and {{NAME');
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('extractVariableNames', () => {
    it('should extract all variable names', () => {
      const names = extractVariableNames('Hello {{NAME}}, you are {{AGE:number}} and {{IS_ACTIVE:boolean}}');
      expect(names).toEqual(['NAME', 'AGE', 'IS_ACTIVE']);
    });

    it('should handle templates without variables', () => {
      const names = extractVariableNames('This has no variables');
      expect(names).toEqual([]);
    });

    it('should remove duplicates', () => {
      const names = extractVariableNames('{{NAME}} and {{NAME}} again');
      expect(names).toEqual(['NAME']);
    });
  });

  describe('hasVariables', () => {
    it('should return true for templates with variables', () => {
      expect(hasVariables('Hello {{NAME}}')).toBe(true);
      expect(hasVariables('{{COUNT}} items')).toBe(true);
    });

    it('should return false for templates without variables', () => {
      expect(hasVariables('Plain text')).toBe(false);
      expect(hasVariables('')).toBe(false);
    });

    it('should handle malformed braces', () => {
      expect(hasVariables('This has { single braces }')).toBe(false);
      expect(hasVariables('This has {{{ triple braces }}}')).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex template with multiple variable types', () => {
      const content = `
        Dear {{CUSTOMER_NAME}},
        
        Thank you for your order #{{ORDER_NUMBER:number}}.
        Your order will be delivered on {{DELIVERY_DATE:date}}.
        
        {{#IF IS_PREMIUM:boolean}}
        As a premium customer, you get free shipping!
        {{/IF}}
        
        Total items: {{ITEM_COUNT:number:1}}
        Status: {{ORDER_STATUS:select:pending}}
        Send notifications: {{SEND_EMAIL:boolean?}}
      `;

      const result = parseTemplate(content);
      
      expect(result.variables).toHaveLength(7);
      
      // Check specific variables
      const customerName = result.variables.find(v => v.name === 'CUSTOMER_NAME');
      expect(customerName?.type).toBe('text');
      expect(customerName?.required).toBe(true);

      const orderNumber = result.variables.find(v => v.name === 'ORDER_NUMBER');
      expect(orderNumber?.type).toBe('number');

      const deliveryDate = result.variables.find(v => v.name === 'DELIVERY_DATE');
      expect(deliveryDate?.type).toBe('date');

      const isPremium = result.variables.find(v => v.name === 'IS_PREMIUM');
      expect(isPremium?.type).toBe('boolean');

      const itemCount = result.variables.find(v => v.name === 'ITEM_COUNT');
      expect(itemCount?.defaultValue).toBe(1);
      expect(itemCount?.required).toBe(false);

      const sendEmail = result.variables.find(v => v.name === 'SEND_EMAIL');
      expect(sendEmail?.required).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        '{{}}',  // Empty variable
        '{{ }}', // Whitespace only
        '{{NAME:}}', // Empty type
        '{{:type}}', // Empty name
        '{{NAME:type:}}', // Empty default
      ];

      edgeCases.forEach(template => {
        expect(() => parseTemplate(template)).not.toThrow();
      });
    });
  });
}); 