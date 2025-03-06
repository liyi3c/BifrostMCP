import * as vscode from 'vscode';
import { RequestType} from 'vscode-jsonrpc';
export interface CSharpExtensionExports {
    initializationFinished: () => Promise<void>;
    logDirectory: string;
    determineBrowserType: () => Promise<string | undefined>;
    experimental: CSharpExtensionExperimentalExports;
    getComponentFolder: (componentName: string) => string;
}
export interface CSharpExtensionExperimentalExports {
    sendServerRequest: <Params, Response, Error>(
        type: RequestType<Params, Response, Error>,
        params: Params,
        token: vscode.CancellationToken
    ) => Promise<Response>;
    languageServerEvents: LanguageServerEvents;
}
export interface LanguageServerEvents {
    readonly onServerStateChange: vscode.Event<ServerStateChangeEvent>;
}
export interface ServerStateChangeEvent {
    state: ServerState;
    workspaceLabel: string;
}
export enum ServerState {
    Stopped = 0,
    Started = 1,
    ProjectInitializationStarted = 2,
    ProjectInitializationComplete = 3,
}
