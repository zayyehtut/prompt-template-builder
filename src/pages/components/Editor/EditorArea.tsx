import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Template } from '@/types/template';
import { Toolbar } from './Toolbar';
import { VariableNode } from './VariableNode';
import { Input } from '@/components/ui/input';

interface EditorAreaProps {
  template: Template | null;
  onNameChange: (name: string) => void;
  onContentChange: (content: string) => void;
  onVariablesExtract: (variables: string[]) => void;
}

const EditorArea = ({
  template,
  onNameChange,
  onContentChange,
  onVariablesExtract,
}: EditorAreaProps) => {
  const editor = useEditor({
    extensions: [StarterKit, VariableNode],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-full',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
      const variables = (editor.getText().match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []).map(v =>
        v.slice(2, -2)
      );
      onVariablesExtract([...new Set(variables)]);
    },
  });

  useEffect(() => {
    if (template && editor && !editor.isDestroyed) {
      if (editor.getHTML() !== template.content) {
        editor.commands.setContent(template.content, false);
      }
    } else if (!template && editor && !editor.isDestroyed) {
      editor.commands.clearContent(false);
    }
  }, [template, editor]);
  
  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary/30 text-center">
        <div>
          <p className="text-lg font-semibold">Select a template</p>
          <p className="text-muted-foreground">or create a new one to start editing.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 bg-secondary/30">
      <div className="flex items-center justify-between pb-4 border-b">
        <Input
          value={template.name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Enter template name..."
          className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 !shadow-none p-0 h-auto"
        />
      </div>
      {editor && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-md bg-background">
        <EditorContent editor={editor} />
      </div>
    </main>
  );
};

export default EditorArea; 

