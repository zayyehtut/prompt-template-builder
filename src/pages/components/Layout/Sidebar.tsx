import React from 'react';
import { Template } from '../../../types/template';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, FilePlus, Star, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onTemplateCreate: () => void;
  onTemplateDelete: (templateId: string) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateDelete,
  isLoading,
}) => {
  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categories = Object.keys(templatesByCategory).sort();

  const handleDeleteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    onTemplateDelete(templateId);
  };

  if (isLoading) {
    return (
      <aside className="w-80 p-4 border-r bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </aside>
    );
  }

  if (templates.length === 0) {
    return (
      <aside className="w-80 p-4 border-r bg-background flex flex-col">
        <Card className="flex-1 flex flex-col items-center justify-center text-center p-6 border-dashed">
          <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Templates Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first template to get started.
          </p>
          <Button onClick={onTemplateCreate}>
            <FilePlus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      </aside>
    );
  }

  return (
    <aside className="w-80 p-4 border-r bg-background flex flex-col gap-4">
      <h2 className="text-xl font-semibold px-2">Templates ({templates.length})</h2>
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        {categories.map(category => (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
              {category}
            </h3>
            <div className="space-y-1">
              {templatesByCategory[category].map(template => (
                <div
                  key={template.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-secondary'
                      : 'hover:bg-secondary/80'
                  }`}
                  onClick={() => onTemplateSelect(template)}
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{template.name}</p>
                      {template.favorite && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Star className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Favorite</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {template.variables.length > 0 && (
                        <span>
                          {template.variables.length} var{template.variables.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleDeleteClick(e, template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete template</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}; 