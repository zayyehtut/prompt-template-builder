import React from 'react';
import { Template } from '../../../types/template';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Star, Loader2, Folder } from 'lucide-react';

interface SidebarProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onTemplateCreate: () => void;
  onTemplateDelete: (templateId: string) => void;
  isLoading: boolean;
}

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-card-depth-1 border-dashed border-border rounded-lg m-4">
    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold">No Templates Yet</h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-xs">
      Create your first template to get started.
    </p>
    <Button onClick={onCreate} variant="default">
      Create Template
    </Button>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateDelete,
  isLoading,
}) => {
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categories = Object.keys(templatesByCategory).sort();

  const handleDeleteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    onTemplateDelete(templateId);
  };

  return (
    <aside className="w-80 p-4 border-r bg-background flex flex-col gap-4">
      {isLoading ? (
        <LoadingState />
      ) : templates.length === 0 ? (
        <EmptyState onCreate={onTemplateCreate} />
      ) : (
        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-4">
          {categories.map(category => (
            <div key={category}>
              <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                <Folder className="w-4 h-4" />
                {category}
              </h3>
              <div className="space-y-1">
                {templatesByCategory[category].map(template => (
                  <div
                    key={template.id}
                    className={`group flex items-center justify-between pl-3 pr-2 py-2 rounded-md cursor-pointer border-l-2 transition-all duration-150 ${
                      selectedTemplate?.id === template.id
                        ? 'bg-primary/10 border-primary text-primary-foreground'
                        : 'border-transparent hover:bg-secondary/50 hover:border-accent'
                    }`}
                    onClick={() => onTemplateSelect(template)}
                  >
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                       {template.favorite && <Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
                      <span className="font-medium truncate flex-1">{template.name}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteClick(e, template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}; 