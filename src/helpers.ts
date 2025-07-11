import * as vscode from 'vscode';
export interface DocumentSymbolResult {
    name: string;
    detail: string;
    kind: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    selectionRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    children: DocumentSymbolResult[];
}

export function convertSymbol(symbol: vscode.DocumentSymbol): DocumentSymbolResult {
    return {
        name: symbol.name,
        detail: symbol.detail,
        kind: getSymbolKindString(symbol.kind),
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
        selectionRange: {
            start: {
                line: symbol.selectionRange.start.line,
                character: symbol.selectionRange.start.character
            },
            end: {
                line: symbol.selectionRange.end.line,
                character: symbol.selectionRange.end.character
            }
        },
        children: symbol.children.map(convertSymbol)
    };
}

export function getSymbolKindString(kind: vscode.SymbolKind): string {
    return vscode.SymbolKind[kind];
}

export async function getPreview(uri: vscode.Uri, line: number | undefined): Promise<string> {
    if (line === null || line === undefined) {
        return "";
    }
    try{
        const document = await vscode.workspace.openTextDocument(uri);
        const lineText = document.lineAt(line).text.trim();
        return lineText;
    } catch (error) {
        console.error(`Error getting preview for ${uri}: ${error}`);
        return "Failed to get preview";
    }
}
 
export function createVscodePosition(line: number, character: number): vscode.Position | undefined {
    if (line === null || line === undefined) {
        return undefined;
    }
    if (character === null || character === undefined) {
        return undefined;
    }
    return new vscode.Position(
        Math.max(line, 0),
        Math.max(character, 0)
    );
}

export async function asyncMap<T, R>(array: T[], asyncCallback: (item: T) => Promise<R>): Promise<R[]> {
    return Promise.all(array.map(asyncCallback));
}

export function convertSemanticTokens(semanticTokens: vscode.SemanticTokens, document: vscode.TextDocument): any {
    const tokens: any[] = [];
    let prevLine = 0;
    let prevChar = 0;

    // Token types and modifiers from VS Code
    const tokenTypes = [
        'namespace', 'type', 'class', 'enum', 'interface',
        'struct', 'typeParameter', 'parameter', 'variable', 'property',
        'enumMember', 'event', 'function', 'method', 'macro',
        'keyword', 'modifier', 'comment', 'string', 'number',
        'regexp', 'operator', 'decorator'
    ];

    const tokenModifiers = [
        'declaration', 'definition', 'readonly', 'static',
        'deprecated', 'abstract', 'async', 'modification',
        'documentation', 'defaultLibrary'
    ];

    // Process tokens in groups of 5 (format: deltaLine, deltaStartChar, length, tokenType, tokenModifiers)
    for (let i = 0; i < semanticTokens.data.length; i += 5) {
        const deltaLine = semanticTokens.data[i];
        const deltaStartChar = semanticTokens.data[i + 1];
        const length = semanticTokens.data[i + 2];
        const tokenType = tokenTypes[semanticTokens.data[i + 3]] || 'unknown';
        const tokenModifiersBitset = semanticTokens.data[i + 4];

        // Calculate absolute position
        const line = prevLine + deltaLine;
        const startChar = deltaLine === 0 ? prevChar + deltaStartChar : deltaStartChar;

        // Get the actual text content
        const tokenText = document.lineAt(line).text.substr(startChar, length);

        // Convert token modifiers bitset to array of strings
        const modifiers = tokenModifiers.filter((_, index) => tokenModifiersBitset & (1 << index));

        tokens.push({
            line,
            startCharacter: startChar,
            length,
            tokenType,
            modifiers,
            text: tokenText
        });

        prevLine = line;
        prevChar = startChar;
    }

    return tokens;
}

export const transformSingleLocation = async (loc: vscode.Location | vscode.LocationLink): Promise<any> => {
    const uri = 'targetUri' in loc ? loc.targetUri : loc.uri;
    const range = 'targetRange' in loc ? loc.targetRange : loc.range;
    
    return {
        uri: uri.toString(),
        range: range ? {
            start: {
                line: range.start.line,
                character: range.start.character
            },
            end: {
                line: range.end.line,
                character: range.end.character
            }
        } : undefined,
        preview: await getPreview(uri, range?.start.line)
    };
};

export const transformLocations = async (locations: (vscode.Location | vscode.LocationLink)[]): Promise<any[]> => {
    if (!locations) {
        return [];
    }
    return asyncMap(locations, transformSingleLocation);
};

