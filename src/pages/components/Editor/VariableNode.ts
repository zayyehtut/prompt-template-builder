// This file will contain the custom Tiptap extension for variables.
// I will implement the logic to parse and render text like {{variable}}. 

import { Node, mergeAttributes, InputRule } from '@tiptap/core';

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

  selectable: false,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'bg-primary/20 text-primary font-semibold rounded-md px-2 py-1',
      },
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: element => element.getAttribute('data-name'),
        renderHTML: attributes => ({ 'data-name': attributes.name }),
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

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      `{{${node.attrs.name}}}`,
    ];
  },

  addCommands() {
    return {
      setVariable: attributes => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\{\{([a-zA-Z0-9_]+)\}\}/,
        handler: ({ match, range, commands }) => {
          const name = match[1];
          if (name) {
            commands.setVariable({ name });
            commands.deleteRange(range);
          }
        },
      }),
    ];
  },
}); 