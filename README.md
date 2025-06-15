# Prompt Template Builder

A browser extension for creating and managing reusable prompt templates with variables for AI interactions.

## 🚀 Features

- **Template Management**: Create, edit, and organize prompt templates
- **Variable System**: Support for typed variables (text, number, boolean, select, date)
- **Quick Access**: Keyboard shortcuts and context menus
- **Local Storage**: All data stored locally in the browser
- **AI Integration**: Direct integration with popular AI platforms
- **Smart Organization**: Auto-categorization and tagging

## 🛠 Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome/Edge browser for testing

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zayyehtut/prompt-template-builder.git
cd prompt-template-builder
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Load the extension in Chrome:
   - Open Chrome Extensions (chrome://extensions/)
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Building for Production

```bash
npm run build
```

The built extension will be in the `dist` folder.

### Testing

```bash
# Run tests once
npm test

# Run tests with coverage
npm run test:ci

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check TypeScript types
npm run type-check

# Format code
npm run format

# Check formatting
npm run format:check

# Run all validations
npm run validate
```

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

- **Quality Checks**: ESLint, TypeScript, Prettier
- **Testing**: Automated test suite with coverage reporting
- **Security**: Dependency auditing and vulnerability scanning
- **Build Verification**: Extension packaging and validation
- **Performance**: Bundle size analysis and optimization
- **Deployment**: Automated releases and artifact management

[![CI/CD Pipeline](https://github.com/zayyehtut/prompt-template-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/zayyehtut/prompt-template-builder/actions/workflows/ci.yml)
[![Security](https://github.com/zayyehtut/prompt-template-builder/actions/workflows/security.yml/badge.svg)](https://github.com/zayyehtut/prompt-template-builder/actions/workflows/security.yml)

## 📖 Usage

1. **Create Templates**: Click the extension icon and create new templates with variables
2. **Use Variables**: Define variables using `{{VARIABLE_NAME}}` syntax
3. **Quick Access**: Use Ctrl+Shift+P (Cmd+Shift+P on Mac) to open the popup
4. **Context Menu**: Right-click on any text input to access templates

## 🏗 Architecture

This extension follows a modern architecture:

- **Manifest V3**: Latest Chrome extension standard
- **React + TypeScript**: Modern UI development
- **Vite**: Fast build tool with hot reload
- **Zustand**: Lightweight state management
- **Tailwind CSS**: Utility-first styling

## 📂 Project Structure

```
src/
├── popup/           # Main popup interface
├── content/         # Content script for page integration
├── background/      # Service worker
├── options/         # Options page
├── lib/            # Shared utilities
└── types/          # TypeScript type definitions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
- [Documentation](docs/README.md)
- [Issues](https://github.com/zayyehtut/prompt-template-builder/issues) 