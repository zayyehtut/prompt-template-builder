import React from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';

interface EditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, language = 'markdown' }) => {
  const { theme } = useTheme();

  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 0,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: {
          top: 16,
          bottom: 16,
        },
      }}
    />
  );
}; 