import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Template } from '@/types/template';
import { storage } from '@/lib/storage';
import { interpolateTemplate } from '@/lib/interpolation';
import { useTheme } from '@/hooks/useTheme';
import { Settings, Plus, FileText, Copy, Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import '../index.css';

const Popup: React.FC = () => {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    const templatesData = await storage.getTemplates();
    const sortedTemplates = Object.values(templatesData).sort(
      (a, b) => b.usageCount - a.usageCount
    );
    setTemplates(sortedTemplates);
    setIsLoading(false);
  };
  
  const handleExecute = async () => {
    if (!activeTemplate) return;

    setIsExecuting(true);
    try {
      const output = interpolateTemplate(activeTemplate.content, variableValues);
      await navigator.clipboard.writeText(output);
      
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
        output,
        executedAt: Date.now(),
      });

      // Show feedback
      setTimeout(() => {
        setIsExecuting(false);
        window.close();
      }, 500);

    } catch (error) {
      console.error('Failed to execute template:', error);
      setIsExecuting(false);
    }
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
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (activeTemplate) {
      return (
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">{activeTemplate.name}</h3>
          
          <div className="space-y-2">
            <Label>Template Preview</Label>
            <Card>
              <CardContent 
                className="p-3 text-sm prose dark:prose-invert max-w-none max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: activeTemplate.content }}
              />
            </Card>
          </div>

          <Separator />

          {activeTemplate.variables.map(variable => (
            <div key={variable.name} className="space-y-2">
              <Label htmlFor={variable.name}>{variable.name}</Label>
              <Input
                id={variable.name}
                value={variableValues[variable.name] || ''}
                onChange={e => handleVariableChange(variable.name, e.target.value)}
                placeholder={variable.placeholder || ''}
              />
            </div>
          ))}
          <Button onClick={handleExecute} disabled={isExecuting} className="w-full">
            {isExecuting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy to Clipboard
          </Button>
          <Button variant="link" onClick={() => setActiveTemplate(null)} className="w-full">
            Back to templates
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-2">
        {templates.length > 0 ? (
          templates.map(template => (
            <Card
              key={template.id}
              className="hover:bg-accent/50 cursor-pointer"
              onClick={() => selectTemplate(template)}
            >
              <CardContent className="p-3">
                <p className="font-semibold">{template.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {template.description || 'No description'}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-10">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-2 text-lg font-semibold">No Templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first template in the manager.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-[400px] h-fit max-h-[600px] bg-background text-foreground flex flex-col ${theme}`}>
      <header className="p-2 border-b flex items-center justify-between">
        <h1 className="text-lg font-bold px-2">Prompts</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => storage.openManager({ action: 'new-template' })} aria-label="New Template">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => storage.openManager()} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>

      <footer className="p-2 border-t text-center">
        <Button variant="link" size="sm" onClick={() => storage.openManager()}>
          Go to Template Manager
        </Button>
      </footer>
    </div>
  );
};

export default Popup; 