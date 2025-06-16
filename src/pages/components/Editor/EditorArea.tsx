import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './Toolbar';
import { VariableNode } from './VariableNode';
import { Input } from '@/components/ui/input';
import { useTemplateStore, useSelectedTemplate } from '@/stores/templateStore';
import { EmptyState } from '@/components/common/EmptyState';
import { FileText } from 'lucide-react';

interface EditorAreaProps {
  // onSave is now handled by the store
}

const EditorArea = ({}: EditorAreaProps) => {
  const { 
    updateFromEditor,
    updateSelectedTemplate,
    saveSelectedTemplate
  } = useTemplateStore();
  const template = useSelectedTemplate();

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
      
      const variableNames: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'variable') {
          variableNames.push(node.attrs.name);
        }
      });
      
      updateFromEditor(html, [...new Set(variableNames)]);
    },
  });
  
  // Save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveSelectedTemplate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveSelectedTemplate]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && template) {
      // Avoid resetting content if it's the same, prevents cursor jump
      if (editor.getHTML() !== template.content) {
        editor.commands.setContent(template.content || '', true);
      }
    } else if (editor && !editor.isDestroyed && !template) {
      editor.commands.clearContent(true);
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
          onChange={e => updateSelectedTemplate({ name: e.target.value })}
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

