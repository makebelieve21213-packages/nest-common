import { describe, it, expect } from "@jest/globals";
import * as packageExports from "src/index";

describe("Index exports", () => {
	it("должен экспортировать HttpValidationPipe", () => {
		expect(packageExports.HttpValidationPipe).toBeDefined();
	});

	it("должен экспортировать RpcValidationPipe", () => {
		expect(packageExports.RpcValidationPipe).toBeDefined();
	});

	it("должен экспортировать UnifiedExceptionFilter", () => {
		expect(packageExports.UnifiedExceptionFilter).toBeDefined();
	});

	it("должен экспортировать UnifiedInterceptor", () => {
		expect(packageExports.UnifiedInterceptor).toBeDefined();
	});

	it("должен экспортировать HttpError", () => {
		expect(packageExports.HttpError).toBeDefined();
	});

	it("должен экспортировать RpcError", () => {
		expect(packageExports.RpcError).toBeDefined();
	});

	it("должен экспортировать SocketError", () => {
		expect(packageExports.SocketError).toBeDefined();
	});

	it("должен экспортировать RpcErrorType", () => {
		expect(packageExports.RpcErrorType).toBeDefined();
	});

	it("должен экспортировать BaseController", () => {
		expect(packageExports.BaseController).toBeDefined();
	});

	it("должен экспортировать validateEnv", () => {
		expect(packageExports.validateEnv).toBeDefined();
		expect(typeof packageExports.validateEnv).toBe("function");
	});
});
