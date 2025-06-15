import { useState, useEffect } from 'react';
import { Template } from '../../../types/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Editor } from './Editor';
import { Save, Sparkles, FileText } from 'lucide-react';

interface EditorAreaProps {
  template: Template | null;
  onTemplateUpdate: (template: Template) => void;
}

const EditorArea = ({ template, onTemplateUpdate }: EditorAreaProps) => {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (template) {
      setContent(template.content);
      setName(template.name);
    } else {
      setContent('');
      setName('');
    }
  }, [template]);

  if (!template) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50">
        <Card className="flex flex-col items-center justify-center text-center p-10 border-dashed w-full max-w-lg h-80">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Template Selected</h2>
          <p className="text-muted-foreground">
            Select a template from the sidebar to start editing, or create a new one.
          </p>
        </Card>
      </main>
    );
  }

  const handleContentChange = (newContent: string | undefined) => {
    if (newContent !== undefined) {
      setContent(newContent);
      onTemplateUpdate({ ...template, content: newContent });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    onTemplateUpdate({ ...template, name: e.target.value });
  };
  
  return (
    <main className="flex-1 flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <Input 
          value={name}
          onChange={handleNameChange}
          className="text-lg font-semibold w-1/2 border-none focus-visible:ring-0 shadow-none"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Improve
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          value={content}
          onChange={handleContentChange}
        />
      </div>
    </main>
  );
};

export default EditorArea; 

