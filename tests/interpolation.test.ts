import { describe, it, expect } from 'vitest';
import {
  interpolateTemplate,
  interpolateAdvanced,
  escapeTemplate,
  unescapeTemplate,
  hasUnresolvedVariables,
  getUnresolvedVariables,
  validateVariables,
} from '../src/lib/interpolation';

describe('Template Interpolation', () => {
  describe('interpolateTemplate', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const variables = { NAME: 'John', PLACE: 'New York' };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to New York!');
    });
    
    it('should handle missing variables with highlighting', () => {
      const template = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const variables = { NAME: 'John' };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to [MISSING: PLACE]!');
    });
    
    it('should throw on missing variables when configured', () => {
      const template = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const variables = { NAME: 'John' };
      
      expect(() => {
        interpolateTemplate(template, variables, { throwOnMissing: true });
      }).toThrow('Missing required variable: PLACE');
    });
    
    it('should handle optional variables', () => {
      const template = 'Hello {{NAME}}, {{GREETING?}}welcome!';
      const variables = { NAME: 'John' };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Hello John, welcome!');
    });
    
    it('should handle optional variables with values', () => {
      const template = 'Hello {{NAME}}, {{GREETING?}}welcome!';
      const variables = { NAME: 'John', GREETING: 'good morning, ' };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Hello John, good morning, welcome!');
    });
    
    it('should apply custom transformers', () => {
      const template = 'Hello {{NAME}}!';
      const variables = { NAME: 'john' };
      const transformers = {
        NAME: (value: unknown) => String(value).toUpperCase(),
      };
      
      const result = interpolateTemplate(template, variables, { transformers });
      expect(result).toBe('Hello JOHN!');
    });
    
    it('should format boolean values', () => {
      const template = 'Active: {{IS_ACTIVE}}, Premium: {{IS_PREMIUM:truefalse}}';
      const variables = { IS_ACTIVE: true, IS_PREMIUM: false };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Active: Yes, Premium: False');
    });
    
    it('should format date values', () => {
      const template = 'Date: {{CREATED_DATE}}, Time: {{CREATED_DATE:time}}';
      const date = new Date('2023-12-25T10:30:00Z');
      const variables = { CREATED_DATE: date };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toContain('Date: ');
      expect(result).toContain('Time: ');
    });
    
    it('should format number values', () => {
      const template = 'Price: {{PRICE:currency}}, Score: {{SCORE:percent}}, Count: {{COUNT:integer}}';
      const variables = { PRICE: 29.99, SCORE: 0.85, COUNT: 42.7 };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Price: $29.99, Score: 85.0%, Count: 43');
    });
    
    it('should format array values', () => {
      const template = 'Items: {{ITEMS}}, Count: {{ITEMS:count}}, Custom: {{ITEMS:join:|}}';
      const variables = { ITEMS: ['apple', 'banana', 'cherry'] };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Items: apple, banana, cherry, Count: 3, Custom: apple|banana|cherry');
    });
    
    it('should handle null and undefined values', () => {
      const template = 'Value1: {{VALUE1}}, Value2: {{VALUE2}}';
      const variables = { VALUE1: null, VALUE2: undefined };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('Value1: , Value2: ');
    });
  });
  
  describe('interpolateAdvanced', () => {
    it('should handle IF conditions with truthy values', () => {
      const template = 'Hello {{NAME}}{{#IF IS_PREMIUM}}, you are a premium user{{/IF}}!';
      const variables = { NAME: 'John', IS_PREMIUM: true };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Hello John, you are a premium user!');
    });
    
    it('should handle IF conditions with falsy values', () => {
      const template = 'Hello {{NAME}}{{#IF IS_PREMIUM}}, you are a premium user{{/IF}}!';
      const variables = { NAME: 'John', IS_PREMIUM: false };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Hello John!');
    });
    
    it('should handle UNLESS conditions', () => {
      const template = 'Hello {{NAME}}{{#UNLESS IS_PREMIUM}}, upgrade to premium{{/UNLESS}}!';
      const variables = { NAME: 'John', IS_PREMIUM: false };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Hello John, upgrade to premium!');
    });
    
    it('should handle EACH loops', () => {
      const template = 'Items:{{#EACH ITEMS}} {{ITEM}}{{/EACH}}';
      const variables = { ITEMS: ['apple', 'banana', 'cherry'] };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Items: apple banana cherry');
    });
    
    it('should handle EACH loops with index', () => {
      const template = '{{#EACH ITEMS}}{{INDEX}}: {{ITEM}}{{#UNLESS LAST}}, {{/UNLESS}}{{/EACH}}';
      const variables = { ITEMS: ['apple', 'banana'] };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('0: apple, 1: banana'); // No trailing comma because LAST should be true for banana
    });
    
    it('should handle WITH blocks', () => {
      const template = '{{#WITH USER}}Hello {{NAME}}, age {{AGE}}{{/WITH}}';
      const variables = { USER: { NAME: 'John', AGE: 30 } };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Hello John, age 30');
    });
    
    it('should handle nested conditions', () => {
      const template = '{{#IF IS_USER}}{{#IF IS_PREMIUM}}Premium user{{/IF}}{{#UNLESS IS_PREMIUM}}Regular user{{/UNLESS}}{{/IF}}';
      const variables = { IS_USER: true, IS_PREMIUM: true };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Premium user');
    });
    
    it('should handle complex conditions with comparisons', () => {
      const template = '{{#IF AGE >= 18}}Adult{{/IF}}{{#IF AGE < 18}}Minor{{/IF}}';
      const variables = { AGE: 25 };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Adult');
    });
    
    it('should handle logical AND conditions', () => {
      const template = '{{#IF IS_USER AND IS_PREMIUM}}Premium user{{/IF}}';
      const variables = { IS_USER: true, IS_PREMIUM: true };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Premium user');
    });
    
    it('should handle logical OR conditions', () => {
      const template = '{{#IF IS_ADMIN OR IS_MODERATOR}}Staff member{{/IF}}';
      const variables = { IS_ADMIN: false, IS_MODERATOR: true };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Staff member');
    });
    
    it('should handle NOT conditions', () => {
      const template = '{{#IF NOT IS_BANNED}}Welcome{{/IF}}';
      const variables = { IS_BANNED: false };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Welcome');
    });
  });
  
  describe('Condition Evaluation', () => {
    it('should evaluate string comparisons', () => {
      const template = '{{#IF NAME == "John"}}Hello John{{/IF}}';
      const variables = { NAME: 'John' };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Hello John');
    });
    
    it('should evaluate number comparisons', () => {
      const template = '{{#IF SCORE > 80}}Great job{{/IF}}';
      const variables = { SCORE: 85 };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Great job');
    });
    
    it('should handle array truthiness', () => {
      const template = '{{#IF ITEMS}}Has items{{/IF}}{{#UNLESS EMPTY_ITEMS}}No empty items{{/UNLESS}}';
      const variables = { ITEMS: ['apple'], EMPTY_ITEMS: [] };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Has itemsNo empty items');
    });
    
    it('should handle string truthiness', () => {
      const template = '{{#IF MESSAGE}}Has message{{/IF}}{{#UNLESS EMPTY_MESSAGE}}No empty message{{/UNLESS}}';
      const variables = { MESSAGE: 'Hello', EMPTY_MESSAGE: '' };
      
      const result = interpolateAdvanced(template, variables);
      expect(result).toBe('Has messageNo empty message');
    });
  });
  
  describe('Utility Functions', () => {
    describe('escapeTemplate', () => {
      it('should escape template syntax', () => {
        const text = 'Use {{variable}} syntax';
        const result = escapeTemplate(text);
        expect(result).toBe('Use \\{\\{variable\\}\\} syntax');
      });
    });
    
    describe('unescapeTemplate', () => {
      it('should unescape template syntax', () => {
        const text = 'Use \\{\\{variable\\}\\} syntax';
        const result = unescapeTemplate(text);
        expect(result).toBe('Use {{variable}} syntax');
      });
    });
    
    describe('hasUnresolvedVariables', () => {
      it('should detect unresolved variables', () => {
        expect(hasUnresolvedVariables('Hello {{NAME}}')).toBe(true);
        expect(hasUnresolvedVariables('Hello John')).toBe(false);
      });
    });
    
    describe('getUnresolvedVariables', () => {
      it('should extract unresolved variable names', () => {
        const template = 'Hello {{NAME}}, age {{AGE:number}}, {{GREETING?}}';
        const result = getUnresolvedVariables(template);
        expect(result).toEqual(['NAME', 'AGE', 'GREETING']);
      });
      
      it('should remove duplicates', () => {
        const template = 'Hello {{NAME}}, goodbye {{NAME}}';
        const result = getUnresolvedVariables(template);
        expect(result).toEqual(['NAME']);
      });
    });
    
    describe('validateVariables', () => {
      it('should validate all variables are provided', () => {
        const template = 'Hello {{NAME}}, age {{AGE}}';
        const variables = { NAME: 'John', AGE: 30 };
        
        const result = validateVariables(template, variables);
        expect(result.valid).toBe(true);
        expect(result.missing).toEqual([]);
        expect(result.errors).toEqual([]);
      });
      
      it('should detect missing required variables', () => {
        const template = 'Hello {{NAME}}, age {{AGE}}';
        const variables = { NAME: 'John' };
        
        const result = validateVariables(template, variables);
        expect(result.valid).toBe(false);
        expect(result.missing).toEqual(['AGE']);
      });
      
      it('should ignore optional variables', () => {
        const template = 'Hello {{NAME}}, {{GREETING?}}';
        const variables = { NAME: 'John' };
        
        const result = validateVariables(template, variables);
        expect(result.valid).toBe(true);
        expect(result.missing).toEqual([]);
      });
      
      it('should detect invalid variable names', () => {
        const template = 'Hello {{123INVALID}}';
        const variables = {};
        
        const result = validateVariables(template, variables);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid variable name: 123INVALID');
      });
      
      it('should skip control structures', () => {
        const template = '{{#IF CONDITION}}Hello{{/IF}}';
        const variables = {};
        
        const result = validateVariables(template, variables);
        expect(result.valid).toBe(true);
      });
    });
  });
  
  describe('Integration Tests', () => {
    it('should handle complex real-world template', () => {
      const template = `
Dear {{CUSTOMER_NAME}},

Thank you for your {{ORDER_TYPE:text:purchase}}! 

{{#IF IS_PREMIUM}}
As a premium member, you get free shipping.
{{/IF}}

{{#UNLESS IS_PREMIUM}}
{{#IF ORDER_TOTAL >= 50}}
You qualify for free shipping!
{{/UNLESS}}
{{/IF}}

Order Details:
{{#EACH ITEMS}}
- {{ITEM.name}} ({{ITEM.quantity}}x) - {{ITEM.price:currency}}
{{/EACH}}

Total: {{ORDER_TOTAL:currency}}
{{#IF DISCOUNT > 0}}
Discount: -{{DISCOUNT:currency}}
Final Total: {{FINAL_TOTAL:currency}}
{{/IF}}

{{#IF ESTIMATED_DELIVERY}}
Estimated delivery: {{ESTIMATED_DELIVERY:date}}
{{/IF}}

Best regards,
The {{COMPANY_NAME}} Team
      `.trim();
      
      const variables = {
        CUSTOMER_NAME: 'John Doe',
        ORDER_TYPE: 'subscription',
        IS_PREMIUM: true,
        ORDER_TOTAL: 75.50,
        DISCOUNT: 10.00,
        FINAL_TOTAL: 65.50,
        ESTIMATED_DELIVERY: new Date('2023-12-30'),
        COMPANY_NAME: 'TechCorp',
        ITEMS: [
          { name: 'Widget A', quantity: 2, price: 25.00 },
          { name: 'Widget B', quantity: 1, price: 25.50 },
        ],
      };
      
      const result = interpolateAdvanced(template, variables);
      
      expect(result).toContain('Dear John Doe');
      expect(result).toContain('subscription');
      expect(result).toContain('As a premium member');
      expect(result).toContain('Widget A (2x) - $25.00');
      expect(result).toContain('Widget B (1x) - $25.50');
      expect(result).toContain('Total: $75.50');
      expect(result).toContain('Discount: -$10.00');
      expect(result).toContain('Final Total: $65.50');
      expect(result).toContain('TechCorp Team');
    });
    
    it('should handle edge cases gracefully', () => {
      const template = '{{EMPTY}}{{NULL}}{{UNDEFINED}}{{ZERO}}{{FALSE}}';
      const variables = {
        EMPTY: '',
        NULL: null,
        UNDEFINED: undefined,
        ZERO: 0,
        FALSE: false,
      };
      
      const result = interpolateTemplate(template, variables);
      expect(result).toBe('0No'); // empty string, empty string, empty string, "0", "No"
    });
    
    it('should handle malformed templates gracefully', () => {
      const template = 'Hello {{NAME} incomplete {{}} empty {{VALID}}';
      const variables = { VALID: 'test' };
      
      // Should not throw, should handle gracefully
      const result = interpolateTemplate(template, variables, { highlightMissing: false });
      expect(result).toContain('test');
    });
  });
}); 