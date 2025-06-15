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
      const html = editor.getHTML();
      onContentChange(html);
      extractVariablesFromContent();
    },
  });

  const extractVariablesFromContent = () => {
    if (!editor) return;

    const variables: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'variable') {
        variables.push(node.attrs.name);
      }
    });

    onVariablesExtract([...new Set(variables)]);
  };

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      if (template) {
        // Only update if the content is actually different
        if (editor.getHTML() !== template.content) {
          editor.commands.setContent(template.content, false); // Don't trigger onUpdate
          // Manually extract variables on initial load by letting the editor process the content
          // and then running our extraction function.
          extractVariablesFromContent();
        }
      } else {
        editor.commands.clearContent(false);
      }
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

