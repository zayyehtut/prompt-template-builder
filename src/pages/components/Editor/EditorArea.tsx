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
  onSave: () => void;
}

const EditorArea = ({
  template,
  onNameChange,
  onContentChange,
  onVariablesExtract,
  onSave,
}: EditorAreaProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit, 
      VariableNode
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-full min-h-[calc(100vh-20rem)]',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      extractVariablesFromContent();
    },
  });
  
  // Save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

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
        // Pre-process the content to convert {{...}} into the format our VariableNode understands.
        const processedContent = template.content.replace(
          /\{\{([a-zA-Z0-9_]+)\}\}/g,
          '<span data-name="$1"></span>'
        );
        
        if (editor.getHTML() !== processedContent) {
          editor.commands.setContent(processedContent, false);
          extractVariablesFromContent();
        }
      } else {
        editor.commands.clearContent(false);
      }
    }
  }, [template, editor]); // Depend on template to re-trigger on template switch

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card text-center p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Select a template</h3>
          <p className="text-muted-foreground mt-2">or create a new one to start editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-card">
      <div className="flex items-center p-4 border-b border-border">
        <Input
          value={template.name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Untitled Template"
          className="text-xl font-semibold border-none focus-visible:ring-0 focus-visible:ring-offset-0 !shadow-none p-0 h-auto bg-transparent"
        />
      </div>
      {editor && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default EditorArea; 

