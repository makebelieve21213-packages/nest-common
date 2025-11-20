import { PipeTransform, Injectable } from "@nestjs/common";
import JsonRpcException from "src/errors/json-rpc.error";
import { JsonRpcErrorCode } from "src/types/json-rpc-error-codes";
import type { JsonRpcRequest } from "src/types/json-rpc-types";

// Пайп для валидации JSON-RPC 2.0 запросов
// Проверяет структуру запроса согласно спецификации JSON-RPC 2.0
@Injectable()
export default class JsonRpcValidationPipe implements PipeTransform {
	transform(value: unknown): JsonRpcRequest {
		// Проверка базовой структуры
		if (!value || typeof value !== "object") {
			throw new JsonRpcException(
				JsonRpcErrorCode.PARSE_ERROR,
				"Invalid JSON-RPC request: request must be an object",
			);
		}

		const request = value as Record<string, unknown>;
		const keys = Object.keys(request);

		// Игнорируем объекты, которые явно не являются JSON-RPC запросами
		// (например, метаданные NestJS: args, constructorRef, handler, contextType)
		if (
			keys.includes("constructorRef") ||
			keys.includes("handler") ||
			keys.includes("contextType")
		) {
			// Это не JSON-RPC запрос, возвращаем как есть (для других параметров метода)
			return value as JsonRpcRequest;
		}

		// Вспомогательная функция для безопасного преобразования значения в строку
		const safeStringify = (val: unknown): string => {
			if (val === null || val === undefined) {
				return String(val);
			}
			if (
				typeof val === "string" ||
				typeof val === "number" ||
				typeof val === "boolean"
			) {
				return String(val);
			}
			if (typeof val === "object") {
				try {
					return JSON.stringify(val);
				} catch {
					return "[object Object]";
				}
			}
			return String(val);
		};

		// Проверка версии протокола
		if (request.jsonrpc !== "2.0") {
			const id =
				request.id !== undefined &&
				(typeof request.id === "string" ||
					typeof request.id === "number")
					? request.id
					: null;
			throw new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				`Invalid JSON-RPC version. Expected "2.0", got "${safeStringify(request.jsonrpc)}"`,
				{ requestId: id },
			);
		}

		// Проверка наличия метода
		if (!request.method || typeof request.method !== "string") {
			const id =
				request.id !== undefined &&
				(typeof request.id === "string" ||
					typeof request.id === "number")
					? request.id
					: null;
			throw new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				"Invalid JSON-RPC request: method is required and must be a string",
				{ requestId: id },
			);
		}

		// Проверка типа id (должен быть string, number или null)
		if (
			request.id !== undefined &&
			request.id !== null &&
			typeof request.id !== "string" &&
			typeof request.id !== "number"
		) {
			throw new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				"Invalid JSON-RPC request: id must be a string, number, or null",
			);
		}

		// Проверка типа params (должен быть object или undefined)
		if (
			request.params !== undefined &&
			request.params !== null &&
			typeof request.params !== "object"
		) {
			throw new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				"Invalid JSON-RPC request: params must be an object or undefined",
			);
		}

		return {
			jsonrpc: "2.0",
			id: request.id as number | string | null | undefined,
			method: request.method as string,
			...(request.params !== undefined && { params: request.params }),
		} as JsonRpcRequest;
	}
}

