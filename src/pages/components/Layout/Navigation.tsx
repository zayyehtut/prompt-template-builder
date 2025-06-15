import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Palette, Save } from 'lucide-react';
import { Theme } from '@/hooks/useTheme';

interface NavigationProps {
  theme: Theme;
  onThemeToggle: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onNewTemplate: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  theme,
  onThemeToggle,
  searchQuery,
  onSearch,
  onNewTemplate,
  onSave,
  isSaveDisabled,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-4 bg-background border-b">
      <div className="flex items-center gap-4">
        <i className="pi pi-logo-square text-2xl text-primary"></i>
        <h1 className="text-xl font-semibold">Template Manager</h1>
      </div>

      <div className="flex-1 mx-8">
        <Input
          type="search"
          placeholder="Search templates..."
          className="w-full max-w-md"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onThemeToggle}>
                <Palette className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cycle Theme (Current: {theme})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button onClick={onNewTemplate}>
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </Button>

        <Button onClick={onSave} disabled={isSaveDisabled}>
          <Save className="h-5 w-5 mr-2" />
          Save
        </Button>
      </div>
    </header>
  );
}; 