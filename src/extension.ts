import * as vscode from 'vscode';
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
import { mcpTools } from './tools';
import { createDebugPanel } from './debugPanel';
import { mcpServer, httpServer, setMcpServer, setHttpServer } from './globals';
import { runTool } from './toolRunner';

export async function activate(context: vscode.ExtensionContext) {
    // Register debug panel command
    context.subscriptions.push(
        vscode.commands.registerCommand('bifrost-mcp.openDebugPanel', () => {
            createDebugPanel(context);
        })
    );

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
            vscode.commands.registerCommand('bifrost-mcp.startServer', async () => {
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
            vscode.commands.registerCommand('bifrost-mcp.startServerOnPort', async () => {
                try {
                    if (httpServer) {
                        vscode.window.showInformationMessage(`MCP server is already running on port ${(httpServer.address() as { port: number }).port}`);
                        return;
                    }

                    const portInput = await vscode.window.showInputBox({
                        prompt: 'Enter the port number to start the MCP server on',
                        placeHolder: '8008',
                        validateInput: (value) => {
                            const port = parseInt(value);
                            if (isNaN(port) || port < 1 || port > 65535) {
                                return 'Please enter a valid port number (1-65535)';
                            }
                            return null;
                        }
                    });

                    if (portInput === undefined) {
                        // User cancelled the input
                        return;
                    }

                    const port = parseInt(portInput);
                    const serverInfo = await startMcpServer(port);
                    vscode.window.showInformationMessage(`MCP server started on port ${serverInfo.port}`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMsg}`);
                }
            }),
            vscode.commands.registerCommand('bifrost-mcp.stopServer', async () => {
                if (!httpServer && !mcpServer) {
                    vscode.window.showInformationMessage('No MCP server is currently running');
                    return;
                }
                
                if (mcpServer) {
                    mcpServer.close();
                    setMcpServer(undefined);
                }
                
                if (httpServer) {
                    httpServer.close();
                    setHttpServer(undefined);
                }
                
                vscode.window.showInformationMessage('MCP server stopped');
            })
        );
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMsg}`);
        console.error("Failed to start MCP server:", error);
    }

    async function startMcpServer(port: number = 8008): Promise<{ mcpServer: Server, httpServer: HttpServer, port: number }> {
        // Create an MCP Server
        setMcpServer(new Server(
            {
                name: "language-tools",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                }
            }
        ));

        // Add tools handlers
        mcpServer!.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: mcpTools
        }));

        // Add call tool handler
        mcpServer!.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                let result: any;
                
                // Verify file exists for commands that require it
                if (args && typeof args === 'object' && 'textDocument' in args && 
                    args.textDocument && typeof args.textDocument === 'object' && 
                    'uri' in args.textDocument && typeof args.textDocument.uri === 'string') {
                    const uri = vscode.Uri.parse(args.textDocument.uri);
                    try {
                        await vscode.workspace.fs.stat(uri);
                    } catch (error) {
                        return {
                            content: [{ 
                                type: "text", 
                                text: `Error: File not found - ${uri.fsPath}` 
                            }],
                            isError: true
                        };
                    }
                }
                
                result = await runTool(name, args);

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
        let currentPort = port;
        while (true)
        {
            try {
                const serv = app.listen(currentPort);
                // Start the server
                setHttpServer(serv);
            
                // Get the actual port (in case the specified port was busy)
                const actualPort = (httpServer!.address() as { port: number }).port;
                console.log(`MCP Server listening on port ${actualPort}`);
                break;
            }
            catch (error) {
                if (currentPort < port + 15)
                {
                    console.error(`Port ${currentPort} is busy, trying next port...`);
                    currentPort++;
                }
                else {
                    throw new Error('Error starting HTTP server:' + (error instanceof Error ? error.message : String(error)));
                
                }
            }
        }

        return {
            mcpServer: mcpServer!,
            httpServer: httpServer!,
            port: currentPort
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