import * as vscode from 'vscode';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as Protocol from './protocol';
import {CSharpExtensionExports} from './omnisharptypes';
import { RequestType } from 'vscode-jsonrpc/node';
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from 'zod';
import { ReferencesAndPreview, ReferencesResponse, ReferenceParams } from './rosyln';
import { getPreviewForReference } from './helpers';


export async function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "dotnetlanguagemcpserver" is now active!');

    const csharpExtension = vscode.extensions.getExtension<CSharpExtensionExports>('ms-dotnettools.csharp');

    if (!csharpExtension) {
        console.error("C# extension is not installed or activated.");
        return;
    }

    try {
        await csharpExtension.activate();
        if (csharpExtension.exports && csharpExtension.exports.initializationFinished)
		{
			await csharpExtension.exports.initializationFinished();
		}
    } catch (error) {
        console.error("Failed to activate or initialize C# extension:", error);
        return;
    }

    // Success! We can now use the C# extension.
    console.log("C# Extension Activated and Initialized!");

    // Now, use sendServerRequest to interact with the Roslyn Language Server.

	initializeMcpServer(csharpExtension)
}

function initializeMcpServer(extension: vscode.Extension<CSharpExtensionExports>) {
    const mcpServer = new Server(
        {
            name: "omnisharp-mcp-server", // Keep this name, even though it's no longer OmniSharp
            version: "0.1.0",
        },
        {
            capabilities: {
                tools: {},
            },
        },
    );

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: "find_usages",
					description: "Finds reference to symbol at a given location.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				}
			]
		};
    });	
	const serverRequest2 = extension.exports.experimental.sendServerRequest;
	async function callTest(){
		let request: ReferenceParams = {
			textDocument: {
				uri: "D:\\Projects\\CreditCompare.ai\\CreditCardInsights.Api\\Controllers\\CreditCardController.cs"
			},
			position: {
				line: 17,
				character: 20
			},
			context: {
				includeDeclaration: true,
			}
		};
		const vscodeCancelToken = new vscode.CancellationTokenSource();
		try {
			const statusRequest = new RequestType<ReferenceParams, ReferencesResponse[], Error>('textDocument/references');
			const result = await serverRequest2<ReferenceParams, ReferencesResponse[], Error>(
				statusRequest,
				request,
				vscodeCancelToken.token
			);
			
			// Get previews for each reference
			for (const reference of result) {
				const preview = await getPreviewForReference(reference);
				console.log(`\nReference in ${reference.uri}:`);
				console.log(preview);
			}
		} catch (error) {
			console.log(error);
		}
	}
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
		const serverRequest = extension.exports.experimental.sendServerRequest;
        if (!serverRequest) {
            return {
                content: [{ type: "text", text: "Roslyn server request interface not available." }],
                isError: true,
            };
        }

        try {
            const { name, arguments: args } = request.params;
            const cancellationTokenSource = new vscode.CancellationTokenSource();
            let result: any;
            switch (name) {
                    case "find_usages":
						const referencesRequest = new RequestType<ReferenceParams, ReferencesResponse[], Error>('textDocument/references');
						const referencesArgs = args as ReferenceParams;
						if (!referencesArgs || !referencesArgs.textDocument || !referencesArgs.textDocument?.uri || !referencesArgs.position || !referencesArgs.position.line || !referencesArgs.position.character) {
							return {
								content: [{ type: "text", text: "Invalid arguments." }],
								isError: true,
							};
						}	
                        const roslynResult = await serverRequest<ReferenceParams, ReferencesResponse[], Error>(referencesRequest, args, cancellationTokenSource.token);
                        const referencesAndPreviews: ReferencesAndPreview[] = [];
						for (const reference of roslynResult) {
                            const preview = await getPreviewForReference(reference);
                            referencesAndPreviews.push({...reference, preview});
                        }
                        result = referencesAndPreviews;
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

    const transport = new StdioServerTransport();
    mcpServer.connect(transport).then(() => {
        console.log("MCP Server connected to transport.");
    });
}

export function deactivate() {}
