import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Template } from '@/types/template';
import { storage } from '@/lib/storage';
import { convertTiptapContentToText, interpolateTiptapContent } from '@/lib/interpolation';
import { useTheme } from '@/hooks/useTheme';
import { Settings, Plus, FileText, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { nanoid } from 'nanoid';
import '../index.css';
import { TemplateList } from '@/components/common/TemplateList';

const AppLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
    <path d="M4 4H8V8H4V4Z" fill="currentColor"/>
    <path d="M4 10H8V14H4V10Z" fill="currentColor" fillOpacity="0.6"/>
    <path d="M4 16H8V20H4V16Z" fill="currentColor" fillOpacity="0.3"/>
    <path d="M10 4H14V8H10V4Z" fill="currentColor" fillOpacity="0.6"/>
    <path d="M10 10H14V14H10V10Z" fill="currentColor"/>
    <path d="M10 16H14V20H10V16Z" fill="currentColor" fillOpacity="0.6"/>
    <path d="M16 4H20V8H16V4Z" fill="currentColor" fillOpacity="0.3"/>
    <path d="M16 10H20V14H16V10Z" fill="currentColor" fillOpacity="0.6"/>
    <path d="M16 16H20V20H16V16Z" fill="currentColor"/>
  </svg>
);

const Popup: React.FC = () => {
  const { theme } = useTheme(document);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    const templatesData = await storage.getTemplates();
    setTemplates(Object.values(templatesData));
    setIsLoading(false);
  };
  
  const handleExecute = async () => {
    if (!activeTemplate || isCopied) return;

    try {
      const interpolated = interpolateTiptapContent(activeTemplate.content, variableValues);
      const outputText = convertTiptapContentToText(interpolated);
      
      await navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      
      const updatedTemplate = { 
        ...activeTemplate, 
        usageCount: (activeTemplate.usageCount || 0) + 1,
        updatedAt: Date.now(),
      };
      await storage.saveTemplate(updatedTemplate);
      
      await storage.addToHistory({
        id: nanoid(),
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
        variables: variableValues,
        output: outputText,
        executedAt: Date.now(),
      });
      
      setTimeout(() => window.close(), 700);

    } catch (error) {
      console.error('Failed to execute template:', error);
    }
    setShowPreview(false);
  };

  const handleVariableChange = (name: string, value: any) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  };

  const selectTemplate = (template: Template) => {
    setActiveTemplate(template);
    setVariableValues(
      template.variables.reduce((acc, v) => {
        acc[v.name] = v.defaultValue ?? '';
        return acc;
      }, {} as Record<string, any>)
    );
    setShowPreview(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (activeTemplate) {
      const interpolatedPreview = interpolateTiptapContent(activeTemplate.content, variableValues);

      return (
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setActiveTemplate(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-base font-semibold truncate">{activeTemplate.name}</h3>
            </div>
            <Button variant={showPreview ? "secondary" : "ghost"} size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto -mr-2 pr-2">
            {showPreview ? (
               <div 
                  className="prose dark:prose-invert prose-sm max-w-none p-2 rounded-md bg-secondary/30 min-h-[80px]"
                  dangerouslySetInnerHTML={{ __html: interpolatedPreview || "<span class='text-muted-foreground'>No content to preview.</span>" }}
                />
            ) : (
              activeTemplate.variables.map(variable => (
                <div key={variable.name} className="space-y-2">
                  <Label htmlFor={variable.name}>{variable.name}</Label>
                  <Input
                    id={variable.name}
                    value={variableValues[variable.name] || ''}
                    onChange={e => handleVariableChange(variable.name, e.target.value)}
                    placeholder={`Enter value for ${variable.name}...`}
                  />
                </div>
              ))
            )}
            
            {activeTemplate.variables.length === 0 && !showPreview && (
              <p className="text-sm text-center text-muted-foreground py-4">This template has no variables.</p>
            )}
          </div>

          <Button onClick={handleExecute} disabled={isCopied} className="w-full mt-4 flex-shrink-0">
            {isCopied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 flex-1 overflow-y-auto">
        {templates.length > 0 ? (
          <TemplateList
            templates={templates}
            selectedTemplateId={(activeTemplate as Template | null)?.id ?? null}
            onTemplateSelect={selectTemplate}
          />
        ) : (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-2 text-lg font-semibold">No Templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one in the manager.
            </p>
            <Button size="sm" className="mt-4" onClick={() => storage.openManager()}>
              Open Manager
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-[400px] h-fit max-h-[600px] bg-background text-foreground flex flex-col ${theme}`}>
      <header className="p-2 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <AppLogo />
          <h1 className="text-base font-bold tracking-wider uppercase">Promptly</h1>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => storage.openManager({ action: 'new-template' })} aria-label="New Template">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => storage.openManager()} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Popup; 