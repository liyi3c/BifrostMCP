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

1. The server runs on port 8008 by default
2. Configure your MCP-compatible AI assistant to connect to:
   - SSE endpoint: `http://localhost:8008/sse`
   - Message endpoint: `http://localhost:8008/message`

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

## TODO

| **Endpoint** | **Purpose for MCP Server (LLM Assistant)** |
|-------------|----------------------------------|
| **`/codecheck`** | Runs full code diagnostics (errors, warnings, linting) and returns issues. LLM can use this to **detect and fix issues**. |
| **`/codeformat`** | Formats code properly. Useful for **cleaning up LLM-generated code** before inserting it into the project. |
| **`/completion`** | Provides **autocomplete suggestions**. The LLM can use this to **enhance its own completions** by comparing them with the language server’s. |
| **`/completion/resolve`** | Further **resolves completion items**, adding details like signatures and documentation. |
| **`/findsymbols`** | Finds **all declared symbols (functions, classes, variables)**, helping the LLM understand the codebase. |
| **`/findusages`** | Finds **where a function, class, or variable is used**. Useful for **refactoring suggestions**. |
| **`/gototypedefinition`** | Finds the **type definition of a symbol** (e.g., where a class is defined). Helps the LLM provide **type-aware completions**. |
| **`/findimplementations`** | Retrieves **implementations of an interface or base class**. Helps the LLM when suggesting method overrides. |
| **`/getcodeactions`** | Lists **available refactoring or quick fixes**. The LLM can suggest applying these fixes. |
| **`/runcodeaction`** | Executes a **refactoring or quick fix**. If the LLM recommends a fix, it can **trigger this action automatically**. |
| **`/rename`** | Renames a symbol across the project. If the LLM suggests a rename, it can apply this action. |
| **`/typelookup`** | Retrieves **type information** for a symbol. Useful for an LLM to provide **type-aware autocompletions**. |
| **`/metadata`** | Retrieves project **metadata** (e.g., dependencies, imports). Helps the LLM understand **frameworks and libraries in use**. |
| **`/runfixall`** | Applies **all available quick fixes**. If the LLM detects multiple issues, it can run this to fix everything in one step. |
| **`/quickinfo`** | Retrieves **hover info** (docs, type hints, signatures). Useful for explaining code in **chat-based LLM assistants**. |


## Troubleshooting

If you encounter issues:

1. Ensure the C# extension is properly installed and activated
2. Check that the C# project has loaded correctly
3. Verify that port 8003 is available on your system

## Contributing

Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/YourUsername/dotnetlanguagemcpserver).

## License

This extension is licensed under the MIT License.
