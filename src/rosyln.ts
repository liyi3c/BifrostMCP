/**
 * Matches the C# `ReferenceParams` class, which extends TextDocumentPositionParams
 * and adds:
 *   - context (ReferenceContext)
 *   - workDoneToken? (IProgress<WorkDoneProgress>)
 *   - partialResultToken? (IProgress<Location[]>)
 */
export interface ReferenceParams extends TextDocumentPositionParams {
    /**
     * Matches C# `ReferenceParams.Context`.
     */
    context: ReferenceContext;
}

/**
 * Matches the C# `ReferenceContext` class
 */
export interface ReferenceContext {
    /**
     * Include the declaration of the current symbol.
     */
    includeDeclaration: boolean;
}

/**
 * Matches the C# `TextDocumentPositionParams` base class,
 * which has a TextDocumentIdentifier and a Position.
 */
export interface TextDocumentPositionParams {
    /**
     * Matches C# `TextDocumentPositionParams.TextDocument`
     */
    textDocument: TextDocumentIdentifier;

    /**
     * Matches C# `TextDocumentPositionParams.Position`
     */
    position: Position;
}

/**
 * Matches the C# `TextDocumentIdentifier` with its `uri` property.
 */
export interface TextDocumentIdentifier {
    /**
     * The URI of the text document (C# `Uri Uri`).
     */
    uri: string;
}

/**
 * Matches C# `Position`, which contains a `Line` and `Character`.
 */
export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface ReferencesResponse {
    uri: string;
    range: Range;
}

export interface ReferencesAndPreview extends ReferencesResponse {
    preview: string;
}

export interface RenameEdit {
    uri: string;
    edits: {
        range: {
            start: { line: number; character: number; };
            end: { line: number; character: number; };
        };
        newText: string;
    }[];
}