/**
 * Безопасно преобразует значение в строку для логирования.
 * Избегает "[object Object]" при сериализации объектов.
 */
export default function stringifyForLog(value: unknown): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
