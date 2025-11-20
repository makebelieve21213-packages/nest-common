import type { RmqContext } from "@nestjs/microservices";

// Константы типов ошибок для классификации
export enum RpcErrorType {
	// Временные ошибки (retry)
	RPC_TIMEOUT = "RPC_TIMEOUT",
	SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
	RPC_SERVICE_UNAVAILABLE = "RPC_SERVICE_UNAVAILABLE",

	// Постоянные ошибки (DLX сразу)
	BAD_REQUEST = "BAD_REQUEST",
	UNAUTHORIZED = "UNAUTHORIZED",
	FORBIDDEN = "FORBIDDEN",
	NOT_FOUND = "NOT_FOUND",
	VALIDATION_ERROR = "VALIDATION_ERROR",
	RPC_VALIDATION_ERROR = "RPC_VALIDATION_ERROR",
	TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
}

// Интерфейс для сообщения с опциональным correlationId для идемпотентности
export interface MessageWithCorrelationId {
	correlationId?: string;
	correlationTimestamp?: number;
	[key: string]: unknown;
}

// Типы для работы с RabbitMQ каналом и сообщениями
export type RmqChannel = ReturnType<NonNullable<RmqContext["getChannelRef"]>>;
export type RmqMessage = ReturnType<NonNullable<RmqContext["getMessage"]>>;
