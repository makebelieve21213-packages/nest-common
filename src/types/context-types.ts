import type { Request } from "express";

// Типы контекстов выполнения в NestJS
export enum ContextType {
	HTTP = "http",
	RPC = "rpc",
	WS = "ws",
}

// Интерфейс пользователя из контекста
export interface UserFromContext {
	id?: string | number;
	email?: string;
	roles?: string[];
	permissions?: string[];
	[key: string]: unknown;
}

// Расширенный тип Request с дополнительными свойствами
export interface ExtendedRequest extends Request {
	user?: UserFromContext;
	id?: string;
}
