import { describe, it, expect } from "@jest/globals";
import validateEnv from "src/utils/env-validator";

describe("validateEnv", () => {
	it("должен успешно валидировать env с всеми обязательными ключами", () => {
		const env = {
			PORT: "3000",
			DATABASE_URL: "postgres://localhost:5432",
			API_KEY: "secret",
		};
		const requiredKeys = ["PORT", "DATABASE_URL", "API_KEY"];

		const result = validateEnv(env, requiredKeys);

		expect(result).toEqual(env);
	});

	it("должен разрешать дополнительные ключи в env", () => {
		const env = {
			PORT: "3000",
			DATABASE_URL: "postgres://localhost:5432",
			EXTRA_KEY: "extra_value",
		};
		const requiredKeys = ["PORT", "DATABASE_URL"];

		const result = validateEnv(env, requiredKeys);

		expect(result).toEqual(env);
	});

	it("должен выбросить ошибку при отсутствии одного обязательного ключа", () => {
		const env = {
			PORT: "3000",
		};
		const requiredKeys = ["PORT", "DATABASE_URL"];

		expect(() => validateEnv(env, requiredKeys)).toThrow("Missing env vars: DATABASE_URL");
	});

	it("должен выбросить ошибку при отсутствии нескольких обязательных ключей", () => {
		const env = {
			PORT: "3000",
		};
		const requiredKeys = ["PORT", "DATABASE_URL", "API_KEY"];

		expect(() => validateEnv(env, requiredKeys)).toThrow("Missing env vars:");
		expect(() => validateEnv(env, requiredKeys)).toThrow("DATABASE_URL");
		expect(() => validateEnv(env, requiredKeys)).toThrow("API_KEY");
	});

	it("должен выбросить ошибку при пустом значении ключа", () => {
		const env = {
			PORT: "",
			DATABASE_URL: "postgres://localhost:5432",
		};
		const requiredKeys = ["PORT", "DATABASE_URL"];

		expect(() => validateEnv(env, requiredKeys)).toThrow("Missing env vars:");
	});

	it("должен успешно валидировать пустой список обязательных ключей", () => {
		const env = {
			PORT: "3000",
			DATABASE_URL: "postgres://localhost:5432",
		};
		const requiredKeys: string[] = [];

		const result = validateEnv(env, requiredKeys);

		expect(result).toEqual(env);
	});

	it("должен успешно валидировать env с одним обязательным ключом", () => {
		const env = {
			PORT: "3000",
		};
		const requiredKeys = ["PORT"];

		const result = validateEnv(env, requiredKeys);

		expect(result.PORT).toBe("3000");
	});

	it("должен выбросить ошибку при полном отсутствии обязательных ключей", () => {
		const env = {
			EXTRA_KEY: "value",
		};
		const requiredKeys = ["PORT", "DATABASE_URL", "API_KEY"];

		expect(() => validateEnv(env, requiredKeys)).toThrow("Missing env vars:");
	});

	it("должен корректно обрабатывать пустой env объект", () => {
		const env = {};
		const requiredKeys = ["PORT"];

		expect(() => validateEnv(env, requiredKeys)).toThrow("Missing env vars: PORT");
	});

	it("должен успешно валидировать env со всеми значениями-строками", () => {
		const env = {
			STRING_VAR: "string",
			NUMBER_VAR: "123",
			BOOLEAN_VAR: "true",
		};
		const requiredKeys = ["STRING_VAR", "NUMBER_VAR", "BOOLEAN_VAR"];

		const result = validateEnv(env, requiredKeys);

		expect(result).toEqual(env);
	});
});
