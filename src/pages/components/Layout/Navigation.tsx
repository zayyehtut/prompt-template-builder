import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Palette, Save, Search } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useTemplateManager } from '@/contexts/TemplateManagerContext';
import { useTemplateActions } from '@/hooks/useTemplateActions';

interface NavigationProps {
  onSave: () => void;
}

const AppLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export const Navigation: React.FC<NavigationProps> = ({ onSave }) => {
  const { theme, toggleTheme } = useTheme();
  const { state } = useTemplateManager();
  const { setSearchQuery, createNewTemplate } = useTemplateActions();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  const handleNewTemplate = () => {
    createNewTemplate();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background">
      <div className="grid grid-cols-3 items-center h-full px-4">
        <div className="flex items-center gap-3">
          <AppLogo />
          <h1 className="text-lg font-bold tracking-wider uppercase text-foreground transition-colors hover:text-primary">
            Promptly
          </h1>
        </div>

        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="w-full pl-9"
              value={state.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 justify-end">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="transition-colors hover:text-primary"
                >
                  <Palette className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Theme (Current: {theme})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" onClick={handleNewTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>

          <Button onClick={onSave} disabled={!state.isDirty}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </header>
  );
}; 