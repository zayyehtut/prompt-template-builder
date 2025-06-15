import React from 'react';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { Folder, Star, Trash2 } from 'lucide-react';

interface TemplateListProps {
  templates: Template[];
  selectedTemplateId?: string | null;
  onTemplateSelect: (template: Template) => void;
  onTemplateDelete?: (templateId: string) => void;
  showCategories?: boolean;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplateDelete,
  showCategories = true,
}) => {
  const templatesByCategory = templates.reduce((acc, template) => {
    let category = 'Uncategorized';
    if (template.favorite) {
      category = 'Favorites';
    } else if (template.category) {
      category = template.category;
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categories = Object.keys(templatesByCategory).sort((a,b) => {
    if (a === 'Favorites') return -1;
    if (b === 'Favorites') return 1;
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  const handleDeleteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    onTemplateDelete?.(templateId);
  };
  
  const renderTemplateItem = (template: Template) => (
    <div
      key={template.id}
      className={`group flex items-center justify-between pl-3 pr-2 py-2 rounded-md cursor-pointer border-l-2 transition-all duration-150 ${
        selectedTemplateId === template.id
          ? 'bg-primary/20 border-primary text-primary-foreground font-semibold'
          : 'border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
      }`}
      onClick={() => onTemplateSelect(template)}
    >
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        {template.favorite && !showCategories && <Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
        <span className="font-medium truncate flex-1">{template.name}</span>
      </div>

      {onTemplateDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => handleDeleteClick(e, template.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (!showCategories) {
    return (
      <div className="space-y-1">
        {templates.map(renderTemplateItem)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <div key={category}>
          <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
            {category === 'Favorites' ? <Star className="w-4 h-4 text-yellow-400" /> : <Folder className="w-4 h-4" />}
            {category}
          </h3>
          <div className="space-y-1">
            {templatesByCategory[category].map(renderTemplateItem)}
          </div>
        </div>
      ))}
    </div>
  );
}; 