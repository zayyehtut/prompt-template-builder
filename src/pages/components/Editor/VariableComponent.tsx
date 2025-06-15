import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

const VariableComponent: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { name } = node.attrs;

  return (
    <NodeViewWrapper
      className={`
        react-component
        inline-block
        rounded-md
        px-2
        py-1
        mx-1
        text-sm
        font-semibold
        border
        cursor-pointer
        transition-all
        ${selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''}
        bg-variable-bg
        text-variable-text
        border-variable-border
      `}
      draggable="true"
      data-drag-handle
    >
      &#123;&#123;{name}&#125;&#125;
    </NodeViewWrapper>
  );
};

export default VariableComponent; 