import { ReferencesResponse } from "./rosyln";
import * as vscode from 'vscode';
export async function getPreviewForReference(reference: ReferencesResponse): Promise<string> {
    try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(reference.uri));
        const startLine = reference.range.start.line;
        const endLine = reference.range.end.line;
        const lines = [];
        
        // Get some context before and after
        const contextLines = 2;
        const startContext = Math.max(0, startLine - contextLines);
        const endContext = Math.min(document.lineCount - 1, endLine + contextLines);
        
        for (let i = startContext; i <= endContext; i++) {
            const line = document.lineAt(i);
            const prefix = i === startLine ? '> ' : '  ';
            lines.push(`${prefix}${line.text}`);
        }
        
        return lines.join('\n');
    } catch (error) {
        return `Error getting preview: ${error}`;
    }
}