import React, { useState, useEffect } from 'react';
import { interpolateTemplate } from '@/lib/interpolation';
import type { Template, Variable } from '@/types/storage';

interface VariableFormProps {
  template: Template;
  onSubmit: (variables: Record<string, unknown>) => void;
  onBack: () => void;
  initialValues?: Record<string, unknown>;
}

export function VariableForm({ template, onSubmit, onBack, initialValues = {} }: VariableFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Initialize values with defaults and initial values
  useEffect(() => {
    const initialVars: Record<string, unknown> = {};
    
    template.variables.forEach((variable) => {
      const key = variable.name;
      if (initialValues[key] !== undefined) {
        initialVars[key] = initialValues[key];
      } else if (variable.defaultValue !== undefined) {
        initialVars[key] = variable.defaultValue;
      } else {
        // Set appropriate default based on type
        switch (variable.type) {
          case 'boolean':
            initialVars[key] = false;
            break;
          case 'number':
            initialVars[key] = '';
            break;
          case 'date':
            initialVars[key] = '';
            break;
          default:
            initialVars[key] = '';
        }
      }
    });
    
    setValues(initialVars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, template.variables.length]); // Only depend on template ID and variable count
  // Note: initialValues is intentionally excluded to prevent infinite re-renders

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    template.variables.forEach((variable) => {
      const value = values[variable.name];
      
      if (variable.required && (value === '' || value === null || value === undefined)) {
        newErrors[variable.name] = `${variable.name} is required`;
        return;
      }

      // Type-specific validation
      if (value !== '' && value !== null && value !== undefined) {
        switch (variable.type) {
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[variable.name] = `${variable.name} must be a valid number`;
            }
            break;
          case 'date':
            if (typeof value === 'string' && value && isNaN(Date.parse(value))) {
              newErrors[variable.name] = `${variable.name} must be a valid date`;
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    // Process values based on type
    const processedValues: Record<string, unknown> = {};
    
    template.variables.forEach((variable) => {
      const value = values[variable.name];
      
      switch (variable.type) {
        case 'number':
          processedValues[variable.name] = value === '' ? undefined : Number(value);
          break;
        case 'boolean':
          processedValues[variable.name] = Boolean(value);
          break;
        case 'date':
          if (typeof value === 'string' && value) {
            processedValues[variable.name] = new Date(value);
          } else {
            processedValues[variable.name] = value;
          }
          break;
        default:
          processedValues[variable.name] = value;
      }
    });

    onSubmit(processedValues);
  };

  const handleValueChange = (variableName: string, value: unknown) => {
    setValues(prev => ({ ...prev, [variableName]: value }));
    
    // Clear error when user starts typing
    if (errors[variableName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[variableName];
        return newErrors;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Generate preview
  const getPreview = () => {
    try {
      return interpolateTemplate(template.content, values);
    } catch (error) {
      return `Preview error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const hasRequiredFields = template.variables.some(v => v.required);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Use Template
            </button>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {template.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''} to fill
            {hasRequiredFields && <span className="text-red-500 ml-1">* required</span>}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        {template.variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm mb-4">This template has no variables</p>
            <button
              onClick={() => onSubmit({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Use Template
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {template.variables.map((variable) => (
              <VariableInput
                key={variable.name}
                variable={variable}
                value={values[variable.name]}
                error={errors[variable.name]}
                onChange={(value) => handleValueChange(variable.name, value)}
                onKeyPress={handleKeyPress}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
              <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100">
                {getPreview()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press Ctrl+Enter (Cmd+Enter) to use template
        </div>
      </div>
    </div>
  );
}

interface VariableInputProps {
  variable: Variable;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

function VariableInput({ variable, value, error, onChange, onKeyPress }: VariableInputProps) {
  const inputId = `var-${variable.name}`;

  const renderInput = () => {
    const baseClasses = `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
      error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
    }`;

    switch (variable.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={inputId}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <label htmlFor={inputId} className="text-sm text-gray-700 dark:text-gray-300">
              {variable.name}
            </label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            id={inputId}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={`Enter ${variable.name.toLowerCase()}...`}
            className={baseClasses}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={inputId}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            className={baseClasses}
          />
        );

      case 'select':
        return (
          <select
            id={inputId}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          >
            <option value="">Select {variable.name.toLowerCase()}...</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default: // text
        return (
          <textarea
            id={inputId}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={`Enter ${variable.name.toLowerCase()}...`}
            rows={3}
            className={`${baseClasses} resize-none`}
          />
        );
    }
  };

  return (
    <div>
      {variable.type !== 'boolean' && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {variable.name}
          {variable.required && <span className="text-red-500 ml-1">*</span>}
          {variable.type !== 'text' && (
            <span className="text-xs text-gray-500 ml-2">({variable.type})</span>
          )}
        </label>
      )}
      
      {renderInput()}
      
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {variable.description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{variable.description}</p>
      )}
      
      {variable.defaultValue !== undefined && variable.type !== 'boolean' && (
        <p className="mt-1 text-xs text-gray-400">
          Default: {String(variable.defaultValue)}
        </p>
      )}
    </div>
  );
} 