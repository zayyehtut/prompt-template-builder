// This file will contain the custom Tiptap extension for variables.
// I will implement the logic to parse and render text like {{variable}}. 

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import VariableComponent from './VariableComponent.tsx';

export interface VariableNodeOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variable: {
      /**
       * Set a variable node
       */
      setVariable: (attributes: { name: string }) => ReturnType;
    };
  }
}

export const VariableNode = Node.create<VariableNodeOptions>({
  name: 'variable',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: element => element.getAttribute('data-name'),
        renderHTML: attributes => {
          if (!attributes.name) {
            return {};
          }

          return {
            'data-name': attributes.name,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-name]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setVariable:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableComponent);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\{\{([a-zA-Z0-9_]+)\}\}/g,
        handler: ({ match, range, commands }) => {
          const [, name] = match;
          if (name) {
            commands.deleteRange(range);
            commands.setVariable({ name });
          }
        },
      }),
    ];
  },
}); 