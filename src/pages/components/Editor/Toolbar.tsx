// This file will contain the Toolbar component for the Tiptap editor.
// It will include a button to insert variables. 

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Code,
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [isAddingVariable, setIsAddingVariable] = useState(false);
  const [variableName, setVariableName] = useState('');
  const variableInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingVariable) {
      variableInputRef.current?.focus();
    }
  }, [isAddingVariable]);

  if (!editor) {
    return null;
  }

  const handleAddVariable = () => {
    if (variableName.trim()) {
      editor.chain().focus().setVariable({ name: variableName.trim() }).run();
      setVariableName('');
      setIsAddingVariable(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVariable();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingVariable(false);
      setVariableName('');
    }
  };

  return (
    <div className="p-2 border-b border-input flex items-center gap-1">
      {isAddingVariable ? (
        <div className="flex items-center gap-1">
          <Input
            ref={variableInputRef}
            type="text"
            value={variableName}
            onChange={(e) => setVariableName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Variable name..."
            className="h-8"
          />
          <Button size="sm" onClick={handleAddVariable}>
            Add
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingVariable(true)}
          title="Add Variable"
        >
          <Code className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
}; 