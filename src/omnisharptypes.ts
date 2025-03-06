import * as vscode from 'vscode';
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


export class ParameterStructures {
	/**
	 * The parameter structure is automatically inferred on the number of parameters
	 * and the parameter type in case of a single param.
	 */
	public static readonly auto = new ParameterStructures('auto');

	/**
	 * Forces `byPosition` parameter structure. This is useful if you have a single
	 * parameter which has a literal type.
	 */
	public static readonly byPosition = new ParameterStructures('byPosition');

	/**
	 * Forces `byName` parameter structure. This is only useful when having a single
	 * parameter. The library will report errors if used with a different number of
	 * parameters.
	 */
	public static readonly byName = new ParameterStructures('byName');

	private constructor(private readonly kind: string) {
	}

	public static is(value: any): value is ParameterStructures {
		return value === ParameterStructures.auto || value === ParameterStructures.byName || value === ParameterStructures.byPosition;
	}

	public toString(): string {
		return this.kind;
	}
}

export interface MessageSignature {
	readonly method: string;
	readonly numberOfParams: number;
	readonly parameterStructures: ParameterStructures;
}

export interface _EM {
	_$endMarker$_: number;
}

export abstract class AbstractMessageSignature implements MessageSignature {

	public readonly method: string;
	public readonly numberOfParams: number;

	constructor(method: string, numberOfParams: number) {
		this.method = method;
		this.numberOfParams = numberOfParams;
	}

	get parameterStructures(): ParameterStructures {
		return ParameterStructures.auto;
	}
}

export class RequestType0<R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 0);
	}
}

export class RequestType<P, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	constructor(method: string, private _parameterStructures: ParameterStructures = ParameterStructures.auto) {
		super(method, 1);
	}

	get parameterStructures(): ParameterStructures {
		return this._parameterStructures;
	}
}

export class RequestType1<P1, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, R, E, _EM] | undefined;
	constructor(method: string, private _parameterStructures: ParameterStructures = ParameterStructures.auto) {
		super(method, 1);
	}

	get parameterStructures(): ParameterStructures {
		return this._parameterStructures;
	}
}

export class RequestType2<P1, P2, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 2);
	}
}

export class RequestType3<P1, P2, P3, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 3);
	}
}

export class RequestType4<P1, P2, P3, P4, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 4);
	}
}

export class RequestType5<P1, P2, P3, P4, P5, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, P5, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 5);
	}
}

export class RequestType6<P1, P2, P3, P4, P5, P6, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, P5, P6, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 6);
	}
}

export class RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, P5, P6, P7, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 7);
	}
}

export class RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, P5, P6, P7, P8, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 8);
	}
}

export class RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E> extends AbstractMessageSignature {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly _: [P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, _EM] | undefined;
	constructor(method: string) {
		super(method, 9);
	}
}