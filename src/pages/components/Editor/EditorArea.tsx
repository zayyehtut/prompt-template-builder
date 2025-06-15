import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './Toolbar';
import { VariableNode } from './VariableNode';
import { Input } from '@/components/ui/input';
import { useTemplateManager } from '@/contexts/TemplateManagerContext';
import { useTemplateActions } from '@/hooks/useTemplateActions';
import { EmptyState } from '@/components/common/EmptyState';
import { FileText } from 'lucide-react';

interface EditorAreaProps {
  onSave: () => void;
}

const EditorArea = ({ onSave }: EditorAreaProps) => {
  const { state } = useTemplateManager();
  const { updateSelectedTemplate, extractVariables } = useTemplateActions();
  const { selectedTemplate: template } = state;

  const handleNameChange = (name: string) => {
    updateSelectedTemplate({ name });
  };

  const handleContentChange = (content: string) => {
    updateSelectedTemplate({ content });
  };

  const handleVariablesExtract = (variables: string[]) => {
    extractVariables(variables);
  };
  
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
      handleContentChange(html);
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
    
    handleVariablesExtract([...new Set(variables)]);
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
          // Persist the processed content and extracted variables to the global state
          handleContentChange(processedContent);
          extractVariablesFromContent();
        }
      } else {
        editor.commands.clearContent(false);
      }
    }
  }, [template, editor]);

  if (!template) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card text-center p-8">
        <EmptyState
          icon={FileText}
          title="Select a template"
          description="or create a new one to start editing."
          className="border-none m-0"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-card">
      <div className="flex items-center p-4 border-b border-border">
        <Input
          value={template.name}
          onChange={e => handleNameChange(e.target.value)}
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

