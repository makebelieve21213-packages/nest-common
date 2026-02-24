import { extractRpcCode, extractRpcMessage, normalizeMessage } from "src/utils/error-extract.utils";

describe("error-extract.utils", () => {
	describe("extractRpcCode", () => {
		it("должен вернуть undefined для не object", () => {
			expect(extractRpcCode("string")).toBeUndefined();
			expect(extractRpcCode(123)).toBeUndefined();
			expect(extractRpcCode(null)).toBeUndefined();
		});

		it("должен извлечь code из data", () => {
			expect(extractRpcCode({ data: { code: "INVALID_REQUEST" } })).toBe("INVALID_REQUEST");
		});

		it("должен извлечь code из response", () => {
			expect(extractRpcCode({ response: { code: "PARSE_ERROR" } })).toBe("PARSE_ERROR");
		});

		it("должен извлечь code из obj.code", () => {
			expect(extractRpcCode({ code: "METHOD_NOT_FOUND" })).toBe("METHOD_NOT_FOUND");
		});

		it("должен извлечь code из obj.message.code (объект message)", () => {
			expect(extractRpcCode({ message: { code: "INVALID_PARAMS" } as Record<string, unknown> })).toBe(
				"INVALID_PARAMS"
			);
		});
	});

	describe("normalizeMessage", () => {
		it("должен вернуть undefined для null и undefined", () => {
			expect(normalizeMessage(null)).toBeUndefined();
			expect(normalizeMessage(undefined)).toBeUndefined();
		});

		it("должен вернуть строку как есть", () => {
			expect(normalizeMessage("error message")).toBe("error message");
		});

		it("должен склеить массив сообщений через '; '", () => {
			expect(normalizeMessage(["err1", "err2"])).toBe("err1; err2");
		});

		it("должен отфильтровать пустые и null в массиве", () => {
			expect(normalizeMessage(["a", null, undefined, "b"])).toBe("a; b");
		});

		it("должен извлечь message из объекта с inner message строкой", () => {
			expect(normalizeMessage({ message: "inner msg" })).toBe("inner msg");
		});

		it("должен извлечь message из объекта с вложенным inner.message", () => {
			expect(normalizeMessage({ message: { message: "nested" } })).toBe("nested");
		});

		it("должен использовать stringifyForLog для объекта без message", () => {
			expect(normalizeMessage({ foo: "bar" })).toBe('{"foo":"bar"}');
		});

		it("должен использовать String для примитивов (не строка/массив/объект)", () => {
			expect(normalizeMessage(123)).toBe("123");
			expect(normalizeMessage(true)).toBe("true");
		});
	});

	describe("extractRpcMessage", () => {
		it("должен вернуть undefined для не object", () => {
			expect(extractRpcMessage("string")).toBeUndefined();
			expect(extractRpcMessage(null)).toBeUndefined();
		});

		it("должен извлечь message через getResponse", () => {
			const obj = {
				getResponse: () => ({ message: "from getResponse" }),
			};
			expect(extractRpcMessage(obj)).toBe("from getResponse");
		});

		it("должен извлечь message из data", () => {
			expect(extractRpcMessage({ data: { message: "data msg" } })).toBe("data msg");
		});

		it("должен извлечь message из obj.message", () => {
			expect(extractRpcMessage({ message: "direct msg" })).toBe("direct msg");
		});
	});
});
