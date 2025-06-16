import React from 'react';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { EmptyState } from '@/components/common/EmptyState';
import { TemplateList } from '@/components/common/TemplateList';

interface SidebarProps {
  templates: Template[];
  // onTemplateDelete is now handled by the store
}

const LoadingState: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
}) => {
  const { 
    isLoading, 
    selectedTemplateId, 
    selectTemplate, 
    createNewTemplate,
    deleteTemplate
  } = useTemplateStore();

  const handleTemplateSelect = (template: Template) => {
    selectTemplate(template.id);
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
          <Button onClick={createNewTemplate} variant="default">
            Create Template
          </Button>
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          <TemplateList
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onTemplateDelete={deleteTemplate}
          />
        </div>
      )}
    </aside>
  );
}; 