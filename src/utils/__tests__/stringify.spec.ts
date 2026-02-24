import stringifyForLog from "src/utils/stringify";

describe("stringifyForLog", () => {
	it("должен вернуть 'null' для null", () => {
		expect(stringifyForLog(null)).toBe("null");
	});

	it("должен вернуть 'undefined' для undefined", () => {
		expect(stringifyForLog(undefined)).toBe("undefined");
	});

	it("должен вернуть строку как есть для string", () => {
		expect(stringifyForLog("hello")).toBe("hello");
	});

	it("должен вернуть String для number", () => {
		expect(stringifyForLog(42)).toBe("42");
	});

	it("должен вернуть String для boolean", () => {
		expect(stringifyForLog(true)).toBe("true");
		expect(stringifyForLog(false)).toBe("false");
	});

	it("должен сериализовать объект через JSON.stringify", () => {
		expect(stringifyForLog({ a: 1, b: "test" })).toBe('{"a":1,"b":"test"}');
	});

	it("должен использовать String(value) при ошибке JSON.stringify (циклическая ссылка)", () => {
		const obj: Record<string, unknown> = {};
		obj.self = obj;
		expect(stringifyForLog(obj)).toBe("[object Object]");
	});
});
