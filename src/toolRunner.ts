import * as vscode from 'vscode';
import { createVscodePosition, getPreview, convertSymbol, asyncMap, convertSemanticTokens, getSymbolKindString, transformLocations, transformSingleLocation } from './helpers';
import { ReferencesAndPreview, RenameEdit } from './rosyln';
import { mcpTools } from './tools';

const toolNames = mcpTools.map((tool) => tool.name);

export const runTool = async (name: string, args: any) => {
    let result: any;
    if (!toolNames.includes(name)) {
        throw new Error(`Unknown tool: ${name}`);
    }
    // Verify file exists before proceeding
    const uri = vscode.Uri.parse(args?.textDocument?.uri ?? '');
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

    const position = args?.position ? createVscodePosition(
        args.position.line,
        args.position.character
    ) : undefined;

    let command: string;
    let commandResult: any;
    
    switch (name) {
        case "find_usages":
            command = 'vscode.executeReferenceProvider';
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                command,
                uri,
                position
            );

            if (!locations) {
                result = [];
                break;
            }
            const references: ReferencesAndPreview[] = await asyncMap(
                locations,
                transformSingleLocation
            );
            result = references;
            break;

        case "go_to_definition":
            command = 'vscode.executeDefinitionProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "find_implementations":
            command = 'vscode.executeImplementationProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_hover_info":
            command = 'vscode.executeHoverProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await asyncMap(commandResult, async (hover: vscode.Hover) => ({
                contents: hover.contents.map(content => 
                    typeof content === 'string' ? content : content.value
                ),
                range: hover.range ? {
                    start: {
                        line: hover.range.start.line,
                        character: hover.range.start.character
                    },
                    end: {
                        line: hover.range.end.line,
                        character: hover.range.end.character
                    }
                } : undefined,
                preview: await getPreview(uri, hover.range?.start.line)
            }));
            break;

        case "get_document_symbols":
            command = 'vscode.executeDocumentSymbolProvider';
            commandResult = await vscode.commands.executeCommand(command, uri);
            result = commandResult?.map(convertSymbol);
            break;

        case "get_completions":
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                uri,
                position,
                args?.triggerCharacter
            );
            result = completions?.items.map(item => ({
                label: item.label,
                kind: item.kind,
                detail: item.detail,
                documentation: item.documentation,
                sortText: item.sortText,
                filterText: item.filterText,
                insertText: item.insertText,
                range: item.range && ('start' in item.range) ? {
                    start: {
                        line: item.range.start.line,
                        character: item.range.start.character
                    },
                    end: {
                        line: item.range.end.line,
                        character: item.range.end.character
                    }
                } : undefined
            }));
            break;

        case "get_signature_help":
            const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
                'vscode.executeSignatureHelpProvider',
                uri,
                position
            );
            result = signatureHelp?.signatures.map(sig => ({
                label: sig.label,
                documentation: sig.documentation,
                parameters: sig.parameters?.map(param => ({
                    label: param.label,
                    documentation: param.documentation
                })),
                activeParameter: signatureHelp.activeParameter,
                activeSignature: signatureHelp.activeSignature
            }));
            break;

        case "get_rename_locations": {
            const newName = args?.newName || "newName";
            const renameEdits = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                'vscode.executeDocumentRenameProvider',
                uri,
                position,
                newName
            );
            if (renameEdits) {
                const entries: RenameEdit[] = [];
                for (const [editUri, edits] of renameEdits.entries()) {
                    entries.push({
                        uri: editUri.toString(),
                        edits: edits.map(edit => ({
                            range: {
                                start: {
                                    line: edit.range.start.line,
                                    character: edit.range.start.character
                                },
                                end: {
                                    line: edit.range.end.line,
                                    character: edit.range.end.character
                                }
                            },
                            newText: edit.newText
                        }))
                    });
                }
                result = entries;
            } else {
                result = [];
            }
            break;
        }
       
        case "rename": {
            const newName = args?.newName || "newName";
            const renameEdits = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                'vscode.executeDocumentRenameProvider',
                uri,
                position,
                newName
            );
            if (renameEdits) {
                const success = await vscode.workspace.applyEdit(renameEdits);
                return {
                    content: [{
                        type: "text",
                        text: success ? "Symbol renamed successfully" : "Symbol renaming failed"
                    }],
                    isError: false
                };
            } else {
                return {
                    content: [{
                        type: "text",
                        text: "Symbol to rename not found"
                    }],
                    isError: false
                };
            }
            break;
        }

        case "get_code_actions":
            console.log("[get_code_actions] start", { uri: uri.toString(), position });
            const t0 = Date.now();
            const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                uri,
                position ? new vscode.Range(position, position) : undefined
            );
            const t1 = Date.now();
            console.log(`[get_code_actions] codeActions fetched in ${t1 - t0}ms, count: ${codeActions?.length}`);
            result = codeActions?.map(action => {
                console.log(`[get_code_actions] action: ${action.title}, diagnostics: ${action.diagnostics?.length}`);
                return {
                    title: action.title,
                    kind: action.kind?.value,
                    isPreferred: action.isPreferred,
                    diagnostics: action.diagnostics?.map(diag => ({
                        message: diag.message,
                        severity: diag.severity,
                        range: {
                            start: {
                                line: diag.range.start.line,
                                character: diag.range.start.character
                            },
                            end: {
                                line: diag.range.end.line,
                                character: diag.range.end.character
                            }
                        }
                    }))
                };
            });
            const t2 = Date.now();
            console.log(`[get_code_actions] result mapped in ${t2 - t1}ms, total elapsed: ${t2 - t0}ms`);
            break;

        case "get_code_lens":
            const codeLensUri = vscode.Uri.parse((args as any).textDocument?.uri);
            try {
                const codeLensResult = await vscode.commands.executeCommand<vscode.CodeLens[]>(
                    'vscode.executeCodeLensProvider',
                    codeLensUri
                );

                if (!codeLensResult || codeLensResult.length === 0) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "No CodeLens items found in document" 
                        }],
                        isError: false
                    };
                }

                result = codeLensResult.map(lens => ({
                    range: {
                        start: {
                            line: lens.range.start.line,
                            character: lens.range.start.character
                        },
                        end: {
                            line: lens.range.end.line,
                            character: lens.range.end.character
                        }
                    },
                    command: lens.command ? {
                        title: lens.command.title,
                        command: lens.command.command,
                        arguments: lens.command.arguments
                    } : undefined
                }));
            } catch (error) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error executing CodeLens provider: ${error}` 
                    }],
                    isError: true
                };
            }
            break;
    
        case "get_selection_range":
            const selectionRanges = await vscode.commands.executeCommand<vscode.SelectionRange[]>(
                'vscode.executeSelectionRangeProvider',
                uri,
                [position]
            );
            result = selectionRanges?.map(range => ({
                range: {
                    start: {
                        line: range.range.start.line,
                        character: range.range.start.character
                    },
                    end: {
                        line: range.range.end.line,
                        character: range.range.end.character
                    }
                },
                parent: range.parent ? {
                    range: {
                        start: {
                            line: range.parent.range.start.line,
                            character: range.parent.range.start.character
                        },
                        end: {
                            line: range.parent.range.end.line,
                            character: range.parent.range.end.character
                        }
                    }
                } : undefined
            }));
            break;

        case "get_type_definition":
            command = 'vscode.executeTypeDefinitionProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_declaration":
            command = 'vscode.executeDeclarationProvider';
            commandResult = await vscode.commands.executeCommand(command, uri, position);
            result = await transformLocations(commandResult);
            break;

        case "get_document_highlights":
            const highlights = await vscode.commands.executeCommand<vscode.DocumentHighlight[]>(
                'vscode.executeDocumentHighlights',
                uri,
                position
            );
            result = highlights?.map(highlight => ({
                range: {
                    start: {
                        line: highlight.range.start.line,
                        character: highlight.range.start.character
                    },
                    end: {
                        line: highlight.range.end.line,
                        character: highlight.range.end.character
                    }
                },
                kind: highlight.kind
            }));
            break;

        case "get_workspace_symbols":
            const query = args.query || '';
            const limit = args.limit ?? 20;
            const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeWorkspaceSymbolProvider',
                query
            );
            result = symbols?.slice(0, limit).map(symbol => ({
                name: symbol.name,
                kind: symbol.kind,
                location: {
                    uri: symbol.location.uri.toString(),
                    range: {
                        start: {
                            line: symbol.location.range.start.line,
                            character: symbol.location.range.start.character
                        },
                        end: {
                            line: symbol.location.range.end.line,
                            character: symbol.location.range.end.character
                        }
                    }
                },
                containerName: symbol.containerName
            }));
            break;

        case "get_semantic_tokens":
            const semanticTokensUri = vscode.Uri.parse((args as any).textDocument?.uri);
            
            // Check if semantic tokens provider is available
            const providers = await vscode.languages.getLanguages();
            const document = await vscode.workspace.openTextDocument(semanticTokensUri);
            const hasSemanticTokens = providers.includes(document.languageId);
            
            if (!hasSemanticTokens) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Semantic tokens not supported for language: ${document.languageId}` 
                    }],
                    isError: true
                };
            }

            try {
                const semanticTokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
                    'vscode.provideDocumentSemanticTokens',
                    semanticTokensUri
                );

                if (!semanticTokens) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "No semantic tokens found in document" 
                        }],
                        isError: false
                    };
                }

                // Convert to human-readable format
                const readableTokens = convertSemanticTokens(semanticTokens, document);
                
                result = {
                    resultId: semanticTokens.resultId,
                    tokens: readableTokens
                };
            } catch (error) {
                // If the command is not found, try alternative approach
                const tokenTypes = [
                    'namespace', 'class', 'enum', 'interface',
                    'struct', 'typeParameter', 'type', 'parameter',
                    'variable', 'property', 'enumMember', 'decorator',
                    'event', 'function', 'method', 'macro', 'keyword',
                    'modifier', 'comment', 'string', 'number', 'regexp',
                    'operator'
                ];
                
                // Use document symbols as fallback
                const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                    'vscode.executeDocumentSymbolProvider',
                    semanticTokensUri
                );

                if (symbols) {
                    result = {
                        fallback: "Using document symbols as fallback",
                        symbols: symbols.map(symbol => ({
                            name: symbol.name,
                            kind: symbol.kind,
                            range: {
                                start: {
                                    line: symbol.range.start.line,
                                    character: symbol.range.start.character
                                },
                                end: {
                                    line: symbol.range.end.line,
                                    character: symbol.range.end.character
                                }
                            },
                            tokenType: tokenTypes[symbol.kind] || 'unknown'
                        }))
                    };
                } else {
                    return {
                        content: [{ 
                            type: "text", 
                            text: "Semantic tokens provider not available and fallback failed" 
                        }],
                        isError: true
                    };
                }
            }
            break;

        case "get_incoming_call_hierarchy": {
            // 新增参数 call_level，默认值为3
            const callLevel = typeof args?.call_level === 'number' ? args.call_level : 3;
            // 第一层，带 item
            async function getIncomingHierarchy(item: vscode.CallHierarchyItem, level: number): Promise<any> {
                if (level <= 0) return null;
                const incomingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
                    'vscode.provideIncomingCalls',
                    item
                );
                // 递归生成每个 incomingCall 的树结构
                const incomingCallsTree = incomingCalls?.map(call =>
                    fillIncomingCalls(call.from, level - 1)
                ) || [];
                // 等待所有递归
                const incomingCallsResult = await Promise.all(incomingCallsTree);
                return {
                    item: {
                        name: item.name,
                        kind: getSymbolKindString(item.kind),
                        detail: item.detail,
                        uri: item.uri.toString(),
                        range: {
                            start: { line: item.range.start.line },
                            end: { line: item.range.end.line }
                        }
                    },
                    incomingCalls: incomingCallsResult.filter(Boolean)
                };
            }
            // 递归生成 { from, incomingCalls } 结构
            async function fillIncomingCalls(fromItem: vscode.CallHierarchyItem, level: number): Promise<any> {
                if (level <= 0) return null;
                const incomingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
                    'vscode.provideIncomingCalls',
                    fromItem
                );
                const incomingCallsTree = incomingCalls?.map(call =>
                    fillIncomingCalls(call.from, level - 1)
                ) || [];
                const incomingCallsResult = await Promise.all(incomingCallsTree);
                return {
                    from: {
                        name: fromItem.name,
                        kind: getSymbolKindString(fromItem.kind),
                        detail: fromItem.detail,
                        uri: fromItem.uri.toString(),
                        range: {
                            start: {
                                line: fromItem.range.start.line,
                                character: fromItem.range.start.character
                            },
                            end: {
                                line: fromItem.range.end.line,
                                character: fromItem.range.end.character
                            }
                        }
                    },
                    incomingCalls: incomingCallsResult.filter(Boolean)
                };
            }
            const callHierarchyItems = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
                'vscode.prepareCallHierarchy',
                uri,
                position
            );
            if (callHierarchyItems?.[0]) {
                result = await getIncomingHierarchy(callHierarchyItems[0], callLevel);
            }
            break;
        }
        case "get_outgoing_call_hierarchy": {
            // 新增参数 include_packages，默认值为 ["cn.webank.cnc"]
            const includePackages: string[] = Array.isArray(args?.include_packages) && args.include_packages.length > 0
                ? args.include_packages
                : ["cn.webank.cnc"];
            const callLevel = typeof args?.call_level === 'number' ? args.call_level : 3;
            const retSimple = typeof args?.retSimple === 'boolean' ? args.retSimple : true;
            // 递归获取 outgoing call 层级，带包名过滤
            async function getOutgoingHierarchy(item: vscode.CallHierarchyItem, level: number): Promise<any> {
                if (level <= 0) return null;
                if (!includePackages.some(pkg => item.detail && item.detail.startsWith(pkg))) {
                    // 不在包名列表，直接返回 null，不递归 outgoing
                    return null;
                }
                const outgoingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
                    'vscode.provideOutgoingCalls',
                    item
                );
                // 递归生成每个 outgoingCall 的树结构
                const outgoingCallsTree = outgoingCalls?.map(call =>
                    fillOutgoingCalls(call.to, level - 1)
                ) || [];
                // 等待所有递归，并过滤掉 null
                const outgoingCallsResult = (await Promise.all(outgoingCallsTree)).filter(Boolean);
                return {
                    item: {
                        name: item.name,
                        kind: getSymbolKindString(item.kind),
                        detail: item.detail,
                        uri: item.uri.toString(),
                        range: {
                            start: { line: item.range.start.line, character: item.range.start.character },
                            end: { line: item.range.end.line, character: item.range.end.character }
                        }
                    },
                    outgoingCalls: outgoingCallsResult
                };
            }
            // 递归生成 { to, outgoingCalls } 结构（去掉fromRanges），带包名过滤
            async function fillOutgoingCalls(toItem: vscode.CallHierarchyItem, level: number): Promise<any> {
                if (level <= 0) return null;
                if (!includePackages.some(pkg => toItem.detail && toItem.detail.startsWith(pkg))) {
                    // 不在包名列表，直接返回 null
                    return null;
                }
                const outgoingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
                    'vscode.provideOutgoingCalls',
                    toItem
                );
                const outgoingCallsTree = outgoingCalls?.map(call =>
                    fillOutgoingCalls(call.to, level - 1)
                ) || [];
                const outgoingCallsResult = (await Promise.all(outgoingCallsTree)).filter(Boolean);
                return {
                    to: {
                        name: toItem.name,
                        kind: getSymbolKindString(toItem.kind),
                        detail: toItem.detail,
                        uri: toItem.uri.toString(),
                        range: {
                            start: { line: toItem.range.start.line, character: toItem.range.start.character },
                            end: { line: toItem.range.end.line, character: toItem.range.end.character }
                        }
                    },
                    outgoingCalls: outgoingCallsResult
                };
            }
            // 辅助函数：获取类名
            function getClassName(detail: string) {
                if (!detail) return '';
                const parts = detail.split('.');
                return parts[parts.length - 1];
            }
            // 辅助函数：将原始树结构转为简化字符串格式（带包名去重）
            function rangeStr(range: any) {
                if (!range) return '';
                return `[${range.start.line}-${range.end.line}]`;
            }
            function simpleItemStr(item: any, parentPkg?: string) {
                const detail = item.detail || '';
                if (parentPkg && detail === parentPkg) {
                    // 只显示类名
                    return `${getClassName(detail)}${rangeStr(item.range)}.${item.name}`;
                } else {
                    return `${detail}${rangeStr(item.range)}.${item.name}`;
                }
            }
            function toSimpleLines(node: any, prefix = '', parentPkg = ''): string[] {
                if (!node) return [];
                let lines: string[] = [];
                let currPkg = '';
                // 处理根节点
                if (node.item) {
                    currPkg = node.item.detail || '';
                    lines.push(simpleItemStr(node.item, parentPkg));
                    if (Array.isArray(node.outgoingCalls) && node.outgoingCalls.length > 0) {
                        const children = node.outgoingCalls.filter(Boolean);
                        children.forEach((child: any, idx: any) => {
                            const isLast = idx === children.length - 1;
                            const branch = isLast ? '└─' : '├─';
                            const childPrefix = prefix + (isLast ? '   ' : '│  ');
                            const childLines = toSimpleLines(child, childPrefix, currPkg);
                            // 第一行加树枝符号，后续行加竖线对齐
                            if (childLines.length > 0) {
                                lines.push(prefix + branch + childLines[0]);
                                for (let i = 1; i < childLines.length; i++) {
                                    lines.push(childPrefix + childLines[i]);
                                }
                            }
                        });
                    }
                } else if (node.to) {
                    currPkg = node.to.detail || '';
                    lines.push(simpleItemStr(node.to, parentPkg));
                    if (Array.isArray(node.outgoingCalls) && node.outgoingCalls.length > 0) {
                        const children = node.outgoingCalls.filter(Boolean);
                        children.forEach((child: any, idx: any) => {
                            const isLast = idx === children.length - 1;
                            const branch = isLast ? '└─' : '├─';
                            const childPrefix = prefix + (isLast ? '   ' : '│  ');
                            const childLines = toSimpleLines(child, childPrefix, currPkg);
                            if (childLines.length > 0) {
                                lines.push(prefix + branch + childLines[0]);
                                for (let i = 1; i < childLines.length; i++) {
                                    lines.push(childPrefix + childLines[i]);
                                }
                            }
                        });
                    }
                }
                return lines;
            }
            const callHierarchyItems = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
                'vscode.prepareCallHierarchy',
                uri,
                position
            );
            if (callHierarchyItems?.[0]) {
                const tree = await getOutgoingHierarchy(callHierarchyItems[0], callLevel);
                if (retSimple) {
                    result = toSimpleLines(tree).join(require('os').EOL);
                } else {
                    result = tree;
                }
            }
            break;
        }

        case "get_type_hierarchy":
            const typeHierarchyItems = await vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                'vscode.prepareTypeHierarchy',
                uri,
                position
            );
            
            if (typeHierarchyItems?.[0]) {
                const [supertypes, subtypes] = await Promise.all([
                    vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                        'vscode.executeTypeHierarchySupertypeCommand',
                        typeHierarchyItems[0]
                    ),
                    vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
                        'vscode.executeTypeHierarchySubtypeCommand',
                        typeHierarchyItems[0]
                    )
                ]);

                result = {
                    item: {
                        name: typeHierarchyItems[0].name,
                        kind: getSymbolKindString(typeHierarchyItems[0].kind),
                        detail: typeHierarchyItems[0].detail,
                        uri: typeHierarchyItems[0].uri.toString(),
                        range: {
                            start: {
                                line: typeHierarchyItems[0].range.start.line,
                                character: typeHierarchyItems[0].range.start.character
                            },
                            end: {
                                line: typeHierarchyItems[0].range.end.line,
                                character: typeHierarchyItems[0].range.end.character
                            }
                        }
                    },
                    supertypes: supertypes?.map(type => ({
                        name: type.name,
                        kind: getSymbolKindString(type.kind),
                        detail: type.detail,
                        uri: type.uri.toString(),
                        range: {
                            start: {
                                line: type.range.start.line,
                                character: type.range.start.character
                            },
                            end: {
                                line: type.range.end.line,
                                character: type.range.end.character
                            }
                        }
                    })),
                    subtypes: subtypes?.map(type => ({
                        name: type.name,
                        kind: getSymbolKindString(type.kind),
                        detail: type.detail,
                        uri: type.uri.toString(),
                        range: {
                            start: {
                                line: type.range.start.line,
                                character: type.range.start.character
                            },
                            end: {
                                line: type.range.end.line,
                                character: type.range.end.character
                            }
                        }
                    }))
                };
            }
            break;
    
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
    return result;
}
