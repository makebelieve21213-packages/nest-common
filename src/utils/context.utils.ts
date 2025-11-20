import type { ExecutionContext } from "@nestjs/common";
import type { ExtendedRequest, UserFromContext } from "src/types/context-types";

// Извлекает пользователя из контекста запроса
export function getUserFromContext(context: ExecutionContext): UserFromContext | undefined {
	const request = context.switchToHttp().getRequest<ExtendedRequest>();
	return request.user;
}

// Извлекает IP адрес из контекста запроса
export function getIpFromContext(context: ExecutionContext): string {
	const request = context.switchToHttp().getRequest<ExtendedRequest>();
	return (
		(request.headers["x-forwarded-for"] as string)?.split(",")[0] ||
		request.ip ||
		request.socket.remoteAddress ||
		"unknown"
	);
}

// Извлекает User-Agent из контекста запроса
export function getUserAgentFromContext(context: ExecutionContext): string {
	const request = context.switchToHttp().getRequest<ExtendedRequest>();
	return (request.headers["user-agent"] as string) || "unknown";
}

// Извлекает Request ID из контекста запроса
export function getRequestIdFromContext(context: ExecutionContext): string {
	const request = context.switchToHttp().getRequest<ExtendedRequest>();
	return (request.headers["x-request-id"] as string) || request.id || "unknown";
}
