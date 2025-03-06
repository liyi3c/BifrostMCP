# C# MCP Server Extension

This VS Code extension provides a Model Context Protocol (MCP) server that exposes C# language features to AI tools. It enables advanced code navigation and analysis capabilities for C# code when using AI coding assistants that support the MCP protocol.

## Features

- **Find Usages**: Locate all references to a symbol in your C# codebase with detailed context
- **HTTP/SSE Server**: Exposes language features over an MCP-compatible HTTP server
- **AI Assistant Integration**: Ready to work with AI assistants that support the MCP protocol

## Requirements

- [C# for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) extension must be installed
- .NET SDK (compatible with the C# extension)

## Installation

1. Install the [C# for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) extension
2. Install this extension
3. Open a C# project in VS Code

## Usage

The extension will automatically start an MCP server when activated. To configure an AI assistant to use this server:

1. The server runs on port 8003 by default
2. Configure your MCP-compatible AI assistant to connect to:
   - SSE endpoint: `http://localhost:8003/sse`
   - Message endpoint: `http://localhost:8003/message`

### Available Commands

- `C# MCP: Start Server` - Manually start the MCP server
- `C# MCP: Stop Server` - Stop the running MCP server

## Tools

### Find Usages

Find all references to a C# symbol in your codebase:

```json
{
  "name": "find_usages",
  "arguments": {
    "textDocument": {
      "uri": "file:///path/to/your/file.cs"
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

The tool returns:
- File paths for each reference
- Line and character positions
- Code preview for each reference

## Troubleshooting

If you encounter issues:

1. Ensure the C# extension is properly installed and activated
2. Check that the C# project has loaded correctly
3. Verify that port 8003 is available on your system

## Contributing

Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/YourUsername/dotnetlanguagemcpserver).

## License

This extension is licensed under the MIT License.
