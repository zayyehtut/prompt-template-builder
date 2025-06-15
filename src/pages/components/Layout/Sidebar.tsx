import React from 'react';
import { Template } from '../../../types/template';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Star, Loader2, Folder } from 'lucide-react';
import { useTemplateManager } from '@/contexts/TemplateManagerContext';
import { useTemplateActions } from '@/hooks/useTemplateActions';
import { EmptyState } from '@/components/common/EmptyState';
import { TemplateList } from '@/components/common/TemplateList';

interface SidebarProps {
  templates: Template[];
  onTemplateDelete: (templateId: string) => void;
}

const LoadingState: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
  onTemplateDelete,
}) => {
  const { state } = useTemplateManager();
  const { createNewTemplate, selectTemplate } = useTemplateActions();
  const { selectedTemplate, isLoading } = state;

  const handleTemplateSelect = (template: Template) => {
    selectTemplate(template);
  };
  
  const handleTemplateCreate = () => {
    createNewTemplate();
  };

  return (
    <aside className="w-80 p-4 border-r bg-background flex flex-col gap-4">
      {isLoading ? (
        <LoadingState />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Templates Yet"
          description="Create your first template to get started."
          className="bg-card-depth-1"
        >
          <Button onClick={handleTemplateCreate} variant="default">
            Create Template
          </Button>
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          <TemplateList
            templates={templates}
            selectedTemplateId={selectedTemplate?.id}
            onTemplateSelect={handleTemplateSelect}
            onTemplateDelete={onTemplateDelete}
          />
        </div>
      )}
    </aside>
  );
}; 