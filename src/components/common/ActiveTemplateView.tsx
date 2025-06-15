import React, { useState } from 'react';
import { Template } from '@/types/template';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { interpolateTiptapContent } from '@/lib/interpolation';

interface ActiveTemplateViewProps {
  template: Template;
  variableValues: Record<string, string>;
  onVariableChange: (name: string, value: string) => void;
  children?: React.ReactNode; // For the "Copy to Clipboard" button
}

export const ActiveTemplateView: React.FC<ActiveTemplateViewProps> = ({
  template,
  variableValues,
  onVariableChange,
  children,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const interpolatedPreview = interpolateTiptapContent(template.content, variableValues);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-end h-8">
        <Button 
          variant={showPreview ? "secondary" : "ghost"} 
          size="icon" 
          className="h-8 w-8"
          onClick={() => setShowPreview(!showPreview)}
          aria-label="Toggle Preview"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pt-2 px-1 pb-2">
        {showPreview ? (
          <div 
            className="prose dark:prose-invert prose-sm max-w-none p-2 rounded-md bg-secondary/30 min-h-[80px]"
            dangerouslySetInnerHTML={{ __html: interpolatedPreview || "<p class='text-muted-foreground'>No content to preview.</p>" }}
          />
        ) : (
          <div className="space-y-4">
            {template.variables.length > 0 ? (
              template.variables.map(variable => (
                <div key={variable.name} className="space-y-2">
                  <Label htmlFor={variable.name}>{variable.name}</Label>
                  <Input
                    id={variable.name}
                    value={variableValues[variable.name] || ''}
                    onChange={e => onVariableChange(variable.name, e.target.value)}
                    placeholder={`Enter value for ${variable.name}...`}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">This template has no variables.</p>
            )}
          </div>
        )}
      </div>
      
      {children && <div className="mt-auto flex-shrink-0 pt-4">{children}</div>}
    </div>
  );
}; 