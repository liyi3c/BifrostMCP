import * as vscode from 'vscode';
import { RequestType } from 'vscode-jsonrpc';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
    CallToolRequestSchema, 
    ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import type { Server as HttpServer } from 'http';
import { Request, Response } from 'express';
import { CSharpExtensionExports } from './omnisharptypes';
import { ReferencesAndPreview, ReferencesResponse, ReferenceParams } from './rosyln';
import { Uri } from 'vscode';

// Store MCP server globally
let mcpServer: Server | undefined;
// Store HTTP server globally
let httpServer: HttpServer | undefined;

async function getPreviewForReference(reference: ReferencesResponse): Promise<string> {
    try {
        const uri = Uri.parse(decodeURIComponent(reference.uri));
        const document = await vscode.workspace.openTextDocument(uri);
        const line = document.lineAt(reference.range.start.line);
        return line.text.trim();
    } catch (error) {
        return "Preview unavailable";
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // Find C# extension
    const csharpExtension = vscode.extensions.getExtension<CSharpExtensionExports>('ms-dotnettools.csharp');
    if (!csharpExtension) {
        vscode.window.showErrorMessage('C# extension is not installed or not activated.');
        return;
    }

    // Activate C# extension if not already activated
    try {
        if (!csharpExtension.isActive) {
            await csharpExtension.activate();
        }

        // Initialize C# extension
        if (csharpExtension.exports && csharpExtension.exports.initializationFinished) {
            await csharpExtension.exports.initializationFinished();
        }
    } catch (error) {
        console.error("Failed to activate or initialize C# extension:", error);
        return;
    }

    // Success! We can now use the C# extension.
    console.log("C# Extension Activated and Initialized!");

    // Start the MCP server
    try {
        const serverInfo = await startMcpServer();
        
        // Add to disposables for cleanup
        context.subscriptions.push({
            dispose: () => {
                if (serverInfo) {
                    if (serverInfo.mcpServer) {
                        serverInfo.mcpServer.close();
                    }
                    if (serverInfo.httpServer) {
                        serverInfo.httpServer.close();
                    }
                }
            }
        });

        // Show information about the server
        vscode.window.showInformationMessage(`MCP server running on port ${serverInfo.port}`);

        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('dotnetlanguagemcpserver.startServer', async () => {
                try {
                    if (httpServer) {
                        vscode.window.showInformationMessage(`MCP server is already running on port ${(httpServer.address() as { port: number }).port}`);
                        return;
                    }
                    const serverInfo = await startMcpServer();
                    vscode.window.showInformationMessage(`MCP server started on port ${serverInfo.port}`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMsg}`);
                }
            }),
            vscode.commands.registerCommand('dotnetlanguagemcpserver.stopServer', async () => {
                if (!httpServer && !mcpServer) {
                    vscode.window.showInformationMessage('No MCP server is currently running');
                    return;
                }
                
                if (mcpServer) {
                    mcpServer.close();
                    mcpServer = undefined;
                }
                
                if (httpServer) {
                    httpServer.close();
                    httpServer = undefined;
                }
                
                vscode.window.showInformationMessage('MCP server stopped');
            })
        );
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMsg}`);
        console.error("Failed to start MCP server:", error);
    }

    async function startMcpServer(port: number = 8003): Promise<{ mcpServer: Server, httpServer: HttpServer, port: number }> {
        // Create an MCP Server
        mcpServer = new Server(
            {
                name: "dotnet-language-tools",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                }
            }
        );

        // Add tools handlers
        mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "find_usages",
                    description: 
                        "Finds all references to a symbol at a specified location in C# code. " +
                        "This tool helps you identify where functions, variables, types, or other symbols are used throughout the codebase. " +
                        "It returns a list of all locations where the symbol is referenced, including: \n" +
                        "- File path of each reference\n" +
                        "- Line and character position\n" +
                        "- A preview of the line containing the reference\n\n" +
                        "This is useful for understanding code dependencies, planning refactoring, or tracing how a particular symbol is used.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            textDocument: {
                                type: "object",
                                description: "The document containing the symbol",
                                properties: {
                                    uri: {
                                        type: "string",
                                        description: "URI of the document (file:///path/to/file.cs format)"
                                    }
                                },
                                required: ["uri"]
                            },
                            position: {
                                type: "object",
                                description: "The position of the symbol",
                                properties: {
                                    line: {
                                        type: "number",
                                        description: "Zero-based line number"
                                    },
                                    character: {
                                        type: "number",
                                        description: "Zero-based character position"
                                    }
                                },
                                required: ["line", "character"]
                            },
                            context: {
                                type: "object",
                                description: "Additional context for the request",
                                properties: {
                                    includeDeclaration: {
                                        type: "boolean",
                                        description: "Whether to include the declaration of the symbol in the results",
                                        default: true
                                    }
                                }
                            }
                        },
                        required: ["textDocument", "position"]
                    }
                }
            ]
        }));

        // Add call tool handler
        mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (!csharpExtension || !csharpExtension.exports.experimental.sendServerRequest) {
                return {
                    content: [{ type: "text", text: "Roslyn server request interface not available." }],
                    isError: true,
                };
            }
            
            const serverRequest = csharpExtension.exports.experimental.sendServerRequest;

            try {
                const { name, arguments: args } = request.params;
                const cancellationTokenSource = new vscode.CancellationTokenSource();
                let result: any;
                
                switch (name) {
                    case "find_usages":
                        const referencesRequest = new RequestType<ReferenceParams, ReferencesResponse[], Error>('textDocument/references');
                        
                        // Validate and cast arguments
                        if (!args || typeof args !== 'object') {
                            return {
                                content: [{ type: "text", text: "Invalid arguments: arguments must be an object." }],
                                isError: true,
                            };
                        }
                        
                        const parsedUri = vscode.Uri.parse((args as any).textDocument?.uri).fsPath;
                        if (!parsedUri) {
                            return {
                                content: [{ type: "text", text: "Invalid arguments: textDocument.uri is required." }],
                                isError: true,
                            };
                        }

                        const referencesArgs: ReferenceParams = {
                            textDocument: { 
                                uri: parsedUri // Normalize to Windows path
                            },
                            position: { 
                                line: (args as any).position?.line, 
                                character: (args as any).position?.character 
                            },
                            context: { 
                                includeDeclaration: (args as any).context?.includeDeclaration ?? true 
                            }
                        };
                        
                        
                        // Validate required properties
                        if (!referencesArgs.textDocument?.uri || 
                            referencesArgs.position?.line === undefined || 
                            referencesArgs.position?.character === undefined) {
                            return {
                                content: [{ 
                                    type: "text", 
                                    text: "Invalid arguments: textDocument.uri, position.line, and position.character are required."
                                }],
                                isError: true,
                            };
                        }

                        try {
                            // Set a timeout for the request
                            // const timeout = 10000; // 10 seconds
                            // setTimeout(() => {
                            //     cancellationTokenSource.cancel();
                            // }, timeout);

                            // Call Roslyn server
                            const roslynResult = await serverRequest<ReferenceParams, ReferencesResponse[], Error>(
                                referencesRequest, 
                                referencesArgs, 
                                cancellationTokenSource.token
                            );

                            // Validate and filter results
                            if (!Array.isArray(roslynResult)) {
                                throw new Error('Invalid response from Roslyn: expected array of references');
                            }

                            // Filter out invalid or duplicate references
                            const uniqueRefs = new Map<string, ReferencesResponse>();
                            for (const ref of roslynResult) {
                                if (!ref.uri || !ref.range) continue;
                                
                                // Create a unique key for each reference
                                const key = `${ref.uri}:${ref.range.start.line}:${ref.range.start.character}`;
                                
                                // Only keep the first occurrence
                                if (!uniqueRefs.has(key)) {
                                    uniqueRefs.set(key, ref);
                                }
                            }

                            // Convert filtered references to array
                            const filteredRefs = Array.from(uniqueRefs.values());
                            
                            // Generate previews for each reference
                            const referencesAndPreviews: ReferencesAndPreview[] = [];
                            for (const reference of filteredRefs) {
                                try {
                                    const preview = await getPreviewForReference(reference);
                                    referencesAndPreviews.push({...reference, preview});
                                } catch (error) {
                                    console.warn(`Failed to get preview for reference: ${error}`);
                                    // Continue with other references even if one preview fails
                                }
                            }

                            console.log(`Found ${referencesAndPreviews.length} unique references after filtering`);
                            result = referencesAndPreviews;

                        } catch (error) {
                            if (error instanceof Error && error.message.includes('Operation cancelled')) {
                                throw new Error('Reference search timed out after 10 seconds');
                            }
                            throw error;
                        } finally {
                            cancellationTokenSource.dispose();
                        }
                        break;
                        
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }

                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    content: [{ type: "text", text: `Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        });

        // Set up Express app
        const app = express();
        app.use(cors());
        app.use(express.json());

        // Track transport for message handling
        let transport: SSEServerTransport | null = null;
        let messageQueue: Array<{ req: Request; res: Response; body: any }> = [];

        // Create SSE endpoint
        app.get('/sse', async (req: Request, res: Response) => {
            console.log('New SSE connection attempt');
            
            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            try {
                // Create and connect transport
                transport = new SSEServerTransport('/message', res);
                if (mcpServer) {
                    await mcpServer.connect(transport);
                    console.log('Server connected to SSE transport');
                    
                    // Process any queued messages
                    while (messageQueue.length > 0) {
                        const { req, res, body } = messageQueue.shift()!;
                        try {
                            await transport.handlePostMessage(req, res, body);
                        } catch (error) {
                            console.error('Error handling queued message:', error);
                        }
                    }
                } else {
                    console.error('MCP Server not initialized');
                    res.status(500).end();
                    return;
                }
                
                // Handle connection close
                req.on('close', () => {
                    console.log('SSE connection closed');
                    transport?.close().catch(err => {
                        console.error('Error closing transport:', err);
                    });
                    transport = null;
                });
            } catch (error) {
                console.error('Error in SSE connection:', error);
                res.status(500).end();
            }
        });
        
        // Create message endpoint
        app.post('/message', async (req: Request, res: Response) => {
            console.log('Received message:', req.body?.method);
            
            if (!transport) {
                console.log('No transport available - queueing message');
                messageQueue.push({ req, res, body: req.body });
                return;
            }
            
            try {
                await transport.handlePostMessage(req, res, req.body);
                console.log('Message handled successfully');
            } catch (error) {
                console.error('Error handling message:', error);
                res.status(500).json({
                    jsonrpc: "2.0",
                    id: req.body?.id,
                    error: {
                        code: -32000,
                        message: String(error)
                    }
                });
            }
        });
        
        // Add health check endpoint
        app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({ status: 'ok' });
        });

        // Start the server
        httpServer = app.listen(port);
        
        // Get the actual port (in case the specified port was busy)
        const actualPort = (httpServer.address() as { port: number }).port;
        console.log(`MCP Server listening on port ${actualPort}`);

        return {
            mcpServer,
            httpServer,
            port: actualPort
        };
    }
}

export function deactivate() {
    if (mcpServer) {
        mcpServer.close();
    }
    if (httpServer) {
        httpServer.close();
    }
}
