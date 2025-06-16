import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { Settings, Plus, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import '../index.css';
import { TemplateList } from '@/components/common/TemplateList';
import { ActiveTemplateView } from '@/components/common/ActiveTemplateView';

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

const App: React.FC = () => {
  const { theme } = useTheme();
  const {
    templates,
    selectedTemplateId,
    variableValues,
    isLoading,
    isCopied,
    loadTemplates,
    selectTemplate,
    setVariableValue,
    executeTemplate,
  } = useTemplateStore();

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openManager = (args?: any) => {
    chrome.runtime.sendMessage({ action: 'openManager', ...args });
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
      return (
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => selectTemplate(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-sm font-medium truncate">{activeTemplate.name}</h3>
            </div>
          </div>
          
          <ActiveTemplateView
            template={activeTemplate}
            variableValues={variableValues}
            onVariableChange={setVariableValue}
          >
            <Button onClick={executeTemplate} disabled={isCopied} className="w-full">
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </ActiveTemplateView>
        </div>
      );
    }

    return (
      <div className="p-4 flex-1 overflow-y-auto">
        {templates.length > 0 ? (
          <TemplateList
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={(template) => selectTemplate(template.id)}
            showCategories={false}
          />
        ) : (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-2 text-lg font-semibold">No Templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one in the manager.
            </p>
            <Button size="sm" className="mt-4" onClick={() => openManager()}>
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
          <Button variant="ghost" size="icon" onClick={() => openManager({ newTemplate: true })} aria-label="New Template">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openManager()} aria-label="Settings">
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

export default App; 