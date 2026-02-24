import stringifyForLog from "src/utils/stringify";

// Извлекает поле code из ошибки (RPC/HTTP)
export function extractRpcCode(exception: unknown): string | undefined {
	if (typeof exception !== "object" || exception === null) return undefined;
	const obj = exception as Record<string, unknown>;
	const response = (
		typeof (obj as Record<string, unknown>).getResponse === "function"
			? (obj as { getResponse: () => unknown }).getResponse()
			: obj.response
	) as Record<string, unknown> | undefined;
	const data = (obj.data ?? response?.data) as Record<string, unknown> | undefined;
	if (data && typeof data.code === "string") return data.code;
	if (response && typeof response.code === "string") return response.code;
	if (typeof obj.code === "string") return obj.code;
	const msgObj = obj.message;
	if (
		msgObj &&
		typeof msgObj === "object" &&
		typeof (msgObj as Record<string, unknown>).code === "string"
	) {
		return (msgObj as Record<string, unknown>).code as string;
	}
	return undefined;
}

// Нормализует message из разных форматов (массив, объект, строка)
export function normalizeMessage(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(normalizeMessage).filter(Boolean).join("; ");
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		const inner = obj.message;
		if (typeof inner === "string") return inner;
		if (
			inner &&
			typeof inner === "object" &&
			typeof (inner as Record<string, unknown>).message === "string"
		) {
			return (inner as Record<string, unknown>).message as string;
		}
		return stringifyForLog(value);
	}
	return String(value);
}

// Извлекает message из ошибки (RPC/HTTP)
export function extractRpcMessage(exception: unknown): string | undefined {
	if (typeof exception !== "object" || exception === null) return undefined;
	const obj = exception as Record<string, unknown>;
	const response = (
		typeof (obj as Record<string, unknown>).getResponse === "function"
			? (obj as { getResponse: () => unknown }).getResponse()
			: obj.response
	) as Record<string, unknown> | undefined;
	const data = (obj.data ?? response?.data) as Record<string, unknown> | undefined;
	const msg = (data?.message ?? response?.message ?? obj.message) as unknown;
	return normalizeMessage(msg);
}
