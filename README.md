# Bifrost - VSCode Dev Tools MCP Server

This VS Code extension provides a Model Context Protocol (MCP) server that exposes VSCode's powerful development tools and language features to AI tools. It enables advanced code navigation, analysis, and manipulation capabilities when using AI coding assistants that support the MCP protocol.

## Features

- **Language Server Integration**: Access VSCode's language server capabilities for any supported language
- **Code Navigation**: Find references, definitions, implementations, and more
- **Symbol Search**: Search for symbols across your workspace
- **Code Analysis**: Get semantic tokens, document symbols, and type information
- **Smart Selection**: Use semantic selection ranges for intelligent code selection
- **Code Actions**: Access refactoring suggestions and quick fixes
- **HTTP/SSE Server**: Exposes language features over an MCP-compatible HTTP server
- **AI Assistant Integration**: Ready to work with AI assistants that support the MCP protocol

## Available Tools

The extension provides access to many VSCode language features including:

- Find References/Usages
- Go to Definition
- Find Implementations
- Get Hover Information
- Document Symbols
- Code Completion
- Signature Help
- Rename Locations
- Code Actions
- Semantic Tokens
- Call Hierarchy
- Type Hierarchy
- CodeLens
- Selection Range
- Type Definition
- Declaration
- Document Highlights
- Workspace Symbol Search

## Requirements

- Visual Studio Code version 1.96.0 or higher
- Appropriate language extensions for the languages you want to work with (e.g., C# extension for C# files)

## Installation

1. Install this extension from the VS Code marketplace
2. Install any language-specific extensions you need for your development
3. Open your project in VS Code

## Usage

The extension will automatically start an MCP server when activated. To configure an AI assistant to use this server:

1. The server runs on port 8008 by default
2. Configure your MCP-compatible AI assistant to connect to:
   - SSE endpoint: `http://localhost:8008/sse`
   - Message endpoint: `http://localhost:8008/message`

### Available Commands

- `MCP: Start Server` - Manually start the MCP server
- `MCP: Stop Server` - Stop the running MCP server
- `MCP: Open Debug Panel` - Open the debug panel to test available tools

## Example Tool Usage

### Find References
```json
{
  "name": "find_usages",
  "arguments": {
    "textDocument": {
      "uri": "file:///path/to/your/file"
    },
    "position": {
      "line": 10,
      "character": 15
    },
    "context": {
      "includeDeclaration": true
    }
  }
}
```

### Workspace Symbol Search
```json
{
  "name": "get_workspace_symbols",
  "arguments": {
    "query": "MyClass"
  }
}
```

## Troubleshooting

If you encounter issues:

1. Ensure you have the appropriate language extensions installed for your project
2. Check that your project has loaded correctly in VSCode
3. Verify that port 8008 is available on your system
4. Check the VSCode output panel for any error messages

## Contributing

Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/biegehydra/csharplangmcpserver).

## License

This extension is licensed under the MIT License.
