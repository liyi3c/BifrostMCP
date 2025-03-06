import * as vscode from 'vscode';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as Protocol from './protocol';
import {CSharpExtensionExports, RequestType} from './omnisharptypes';
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from 'zod';


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
					name: "code_check",
					description: "Requests diagnostics for a specific document.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "block_structure",
					description: "Gets a hierarchical structure of the blocks in the specified file.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "code_structure",
					description: "Gets a higher level hierarchical structure of the types/members in the specified file.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "discover_tests",
					description:
						"Discovers tests in the current project using the test runner specified in settings, or using the project system, to discover how to run the tests.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "find_implementations",
					description: "Finds implementations of a symbol at a given location.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "find_symbols",
					description: "Finds symbols using fuzzy matching in the current workspace.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "find_usages",
					description: "Finds reference to symbol at a given location.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "format_after_keystroke",
					description: "Invokes formatting on a single line after a keystroke.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "format_range",
					description: "Invokes formatting on a specific range.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_code_actions",
					description: "Gets a list of available code actions for a given context.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "go_to_definition",
					description: "Navigates to the definition of a symbol.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "go_to_type_definition",
					description: "Navigates to the definition of the type of a symbol.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_source_generated_file",
					description: "retrieves the source generated file if its available",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_updated_source_generated_file",
					description: "Updates the source generated file",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "rename",
					description: "Renames a symbol.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "request_project_information",
					description: "Requests information about a specific project",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "request_workspace_information",
					description: "Requests information about Workspace",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
						},
				},
				{
					name: "run_code_action",
					description: "Runs a specific code action.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "signature_help",
					description: "Provides signature help information at a given position.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "type_lookup",
					description: "Gets information about the type of a symbol.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "update_buffer",
					description: "Updates the content of a buffer.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_metadata",
					description: "Retrieves metadata for a given type in an assembly.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "reAnalyze",
					description: "ReAnalyzes a project or solution.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_test_start_info",
					description: "Gets test start information.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "run_test",
					description: "Runs a test.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "run_tests_in_class",
					description: "Runs tests within a specific class.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "run_tests_in_context",
					description: "Runs tests within context of caret.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "debug_test_get_start_info",
					description: "Gets debug test start information.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "debug_test_class_get_start_info",
					description: "Gets debug test start information for a class.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "debug_tests_in_context_get_start_info",
					description: "Gets debug tests start info for tests within context of caret.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},					
				{
					name: "debug_test_launch",
					description: "Launches a debug test.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "debug_test_stop",
					description: "Stops a debug test.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_quick_info",
					description: "Provides quick info documentation for symbol at a given position.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_completion",
					description: "Provides code completion proposals at a given location.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_completion_resolve",
					description: "Resolves additional information for a selected completion item.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_completion_after_insert",
					description: "Gets completion details after insertion.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_inlay_hints",
					description: "Provides inlay hints in a given range.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "resolve_inlay_hints",
					description: "Resolves additional information for a given inlay hint.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_semantic_highlights",
					description: "Provides semantic highlights for a given document.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "run_fix_all",
					description:
						"Runs all the available fix all providers that applies to this document and returns the changes to the document.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				},
				{
					name: "get_fix_all",
					description: "Gets the fix all occurrences request for a diagnostic found by using get code actions.",
					inputSchema: zodToJsonSchema(z.any()) as any,
				}
			]
		};
    });	
	const serverRequest2 = extension.exports.experimental.sendServerRequest;
	async function callTest(){
		let request: Protocol.FindUsagesRequest = {
			FileName: "D:\\Projects\\CreditCompare.ai\\CreditCardInsights.Api\\Controllers\\CreditCardController.cs",
			Line: 17,
			Column: 10,
			OnlyThisFile: true,
			ExcludeDefinition: false
		};
		const vscodeCancelToken = new vscode.CancellationTokenSource();
		const tryT = ['protocol.FindUsages', 'o#/findusages', 'findusages'];
		let i = 0;
		while (true) {
			try{
				const statusRequest = new RequestType<Protocol.FindUsagesRequest, Protocol.FindSymbolsResponse, Error>(tryT[i]);
				const result = await serverRequest2<object, boolean, void>(
					statusRequest,
					request,
					vscodeCancelToken.token
				);
				console.log(result);
			}
			catch (error){
				console.log(error);
			}
			i++;
		}
	}
	callTest();
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
            const cancellationTokenSource = new CancellationTokenSource();
            let result: any;

            switch (name) {
                case "code_check":
                        result = await serverRequest<Protocol.QuickInfoRequest, Protocol.QuickInfoResponse>(Protocol.Requests.CodeCheck, args, cancellationTokenSource.token);
                        break;
                    case "block_structure":
                        result = await serverRequest<Protocol.V2.BlockStructureRequest, any>(Protocol.Requests.BlockStructure, args, cancellationTokenSource.token);
                        break;
                    case "code_structure":
                        result = await serverRequest<Protocol.V2.Structure.CodeStructureRequest, Protocol.V2.Structure.CodeStructureResponse>(Protocol.V2.Requests.CodeStructure, args, cancellationTokenSource.token);
                        break;
                    case "discover_tests":
                        result = await serverRequest<Protocol.V2.DiscoverTestsRequest, any>(Protocol.V2.Requests.DiscoverTests, args);
                        break;
                    case "find_implementations":
                        result = await serverRequest<Protocol.FindImplementationsRequest, Protocol.QuickInfoResponse>(Protocol.Requests.FindImplementations, args, cancellationTokenSource.token);
                        break;
                    case "find_symbols":
                        result = await serverRequest<Protocol.FindSymbolsRequest, Protocol.FindSymbolsResponse>(Protocol.Requests.FindSymbols, args, cancellationTokenSource.token);
                        break;
                    case "find_usages":
                        result = await serverRequest<Protocol.FindUsagesRequest, Protocol.FindSymbolsResponse>(Protocol.Requests.FindUsages, args, cancellationTokenSource.token);
                        break;
                    case "format_after_keystroke":
                        result = await serverRequest<Protocol.FormatAfterKeystrokeRequest, Protocol.FormatRangeResponse>(Protocol.Requests.FormatAfterKeystroke, args, cancellationTokenSource.token);
                        break;
                    case "format_range":
                        result = await serverRequest<Protocol.FormatRangeRequest, Protocol.FormatRangeResponse>(Protocol.Requests.FormatRange, args, cancellationTokenSource.token);
                        break;
                    case "get_code_actions":
                        result = await serverRequest<Protocol.V2.GetCodeActionsRequest, Protocol.QuickInfoResponse>(Protocol.V2.Requests.GetCodeActions, args, cancellationTokenSource.token);
                        break;
                    case "go_to_definition":
                        result = await serverRequest<Protocol.V2.GoToDefinitionRequest, Protocol.V2.GoToDefinitionResponse>(Protocol.V2.Requests.GoToDefinition, args, cancellationTokenSource.token);
                        break;
                    case "go_to_type_definition":
                        result = await serverRequest<Protocol.GoToTypeDefinitionRequest, Protocol.GoToTypeDefinitionResponse>(Protocol.Requests.GoToTypeDefinition, args, cancellationTokenSource.token);
                        break;
                    case "get_source_generated_file":
                        result = await serverRequest<Protocol.SourceGeneratedFileRequest, Protocol.SourceGeneratedFileResponse>(Protocol.Requests.SourceGeneratedFile, args, cancellationTokenSource.token);
                        break;
                    case "get_updated_source_generated_file":
                        result = await serverRequest<Protocol.UpdateSourceGeneratedFileRequest, Protocol.UpdateSourceGeneratedFileResponse>(Protocol.Requests.UpdateSourceGeneratedFile, args);
                        break;
                    case "files_changed":
                        result = await serverRequest<any, void>(Protocol.Requests.FilesChanged, args);
                        break;
                    case "rename":
                        result = await serverRequest<Protocol.RenameRequest, Protocol.RenameResponse>(Protocol.Requests.Rename, args, cancellationTokenSource.token);
                        break;
                    case "request_project_information":
                        result = await serverRequest<Protocol.Request, Protocol.ProjectInformationResponse>(Protocol.Requests.Project, args);
                        break;
                    case "request_workspace_information":
                        result = await serverRequest<any, Protocol.WorkspaceInformationResponse>(Protocol.Requests.Projects);						
						break;
                    case "run_code_action":
                        result = await serverRequest<Protocol.V2.RunCodeActionRequest, Protocol.QuickInfoResponse>(Protocol.V2.Requests.RunCodeAction, args);
                        break;
					case "signature_help":
						result = await serverRequest<Protocol.SignatureHelp, any>(Protocol.Requests.SignatureHelp, args, cancellationTokenSource.token);
						break;
					case "type_lookup":
						result = await serverRequest<Protocol.TypeLookupRequest, Protocol.TypeLookupResponse>(Protocol.Requests.TypeLookup, args, cancellationTokenSource.token);
						break;
					case "update_buffer":
						result = await serverRequest<Protocol.UpdateBufferRequest, boolean>(Protocol.Requests.UpdateBuffer, args);
						break;
                    case "get_metadata":
                        result = await serverRequest<Protocol.MetadataRequest, Protocol.MetadataResponse>(Protocol.Requests.Metadata, args);
                        break;
                    case "reAnalyze":
                        result = await serverRequest<Protocol.ReAnalyzeRequest, Record<string, never>>(Protocol.Requests.ReAnalyze, args);
                        break;
					case "get_test_start_info":
                        result = await serverRequest<Protocol.V2.GetTestStartInfoRequest, Protocol.V2.GetTestStartInfoResponse>(Protocol.V2.Requests.GetTestStartInfo, args);
                        break;
					case "run_test":
                        result = await serverRequest<Protocol.V2.RunTestRequest, Protocol.V2.RunTestResponse>(Protocol.V2.Requests.RunTest, args);
                        break;
                    case "run_tests_in_class":
                        result = await serverRequest<Protocol.V2.RunTestsInClassRequest, Protocol.V2.RunTestResponse>(Protocol.V2.Requests.RunAllTestsInClass, args);
                        break;
					case "run_tests_in_context":
                        result = await serverRequest<Protocol.V2.RunTestsInContextRequest, Protocol.V2.RunTestResponse>(Protocol.V2.Requests.RunTestsInContext, args);
                        break;
                    case "debug_test_get_start_info":
                        result = await serverRequest<Protocol.V2.DebugTestGetStartInfoRequest, Protocol.V2.DebugTestGetStartInfoResponse>(Protocol.V2.Requests.DebugTestGetStartInfo,args);
                        break;
					case "debug_test_class_get_start_info":
                        result = await serverRequest<Protocol.V2.DebugTestClassGetStartInfoRequest, Protocol.V2.DebugTestGetStartInfoResponse>(Protocol.V2.Requests.DebugTestsInClassGetStartInfo, args);
                        break;
                    case "debug_tests_in_context_get_start_info":
                        result = await serverRequest<Protocol.V2.DebugTestGetStartInfoRequest, Protocol.V2.DebugTestGetStartInfoResponse>(Protocol.V2.Requests.DebugTestsInContextGetStartInfo, args);
                        break;
					case "debug_test_launch":
                        result = await serverRequest<any, any>(Protocol.V2.Requests.DebugTestLaunch, request);
                        break;
					case "debug_test_stop":
                        result = await serverRequest<any, any>(Protocol.V2.Requests.DebugTestStop, request);
                        break;
					case "get_semantic_highlights":
                        result = await serverRequest<Protocol.V2.SemanticHighlightRequest, Protocol.SemanticHighlightResponse>(Protocol.V2.Requests.Highlight, args);
                        break;
					case "get_quick_info":
						result = await serverRequest<Protocol.QuickInfoRequest, Protocol.QuickInfoResponse>(Protocol.Requests.QuickInfo, args, cancellationTokenSource.token);
						break;
					case "get_completion":
                        result = await serverRequest<Protocol.CompletionRequest, Protocol.CompletionResponse>(Protocol.Requests.Completion, args, cancellationTokenSource.token);
                        break;
					case "get_completion_resolve":
                        result = await serverRequest<Protocol.CompletionResolveRequest, Protocol.CompletionResolveResponse>(Protocol.Requests.CompletionResolve, args, cancellationTokenSource.token);
                        break;
					case "get_completion_after_insert":
                        result = await serverRequest<Protocol.CompletionAfterInsertionRequest, Protocol.CompletionAfterInsertResponse>(Protocol.Requests.CompletionAfterInsert, args);
                        break;
                    case "get_inlay_hints":
                        result = await serverRequest<Protocol.InlayHintRequest, Protocol.InlayHintResponse>(Protocol.Requests.InlayHint, args, cancellationTokenSource.token);
                         break;
                    case "resolve_inlay_hints":
                        result = await serverRequest<Protocol.InlayHintResolve, Protocol.InlayHint>(Protocol.Requests.InlayHintResolve, args, cancellationTokenSource.token);
                        break;
					case "run_fix_all":
                        result = await serverRequest<Protocol.RunFixAllRequest, Protocol.RunFixAllActionResponse>(Protocol.Requests.RunFixAll, args);
                        break;
					case "get_fix_all":
                        result = await serverRequest<Protocol.GetFixAllRequest, Protocol.GetFixAllResponse>(Protocol.Requests.GetFixAll, args);
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
