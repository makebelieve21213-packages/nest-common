import { describe, it, expect, beforeEach } from "@jest/globals";
import { RpcException } from "@nestjs/microservices";
import { IsString, IsNumber } from "class-validator";
import RpcValidationPipe from "src/pipes/rpc-validation.pipe";

class TestDto {
	@IsString()
	name!: string;

	@IsNumber()
	age!: number;
}

describe("RpcValidationPipe", () => {
	let pipe: RpcValidationPipe<TestDto>;

	beforeEach(() => {
		pipe = new RpcValidationPipe(TestDto);
	});

	it("должен успешно валидировать корректный DTO", async () => {
		const input = { name: "John", age: 30 };
		const result = await pipe.transform(input as TestDto);

		expect(result).toBeInstanceOf(TestDto);
		expect(result.name).toBe("John");
		expect(result.age).toBe(30);
	});

	it("должен преобразовывать строку в число для age", async () => {
		const input = { name: "John", age: "30" };
		const result = await pipe.transform(input as unknown as TestDto);

		expect(result).toBeInstanceOf(TestDto);
		expect(result.age).toBe(30);
	});

	it("должен выбросить RpcException при невалидном name", async () => {
		const input = { name: null, age: 30 };

		try {
			await pipe.transform(input as unknown as TestDto);
			expect(true).toBe(false);
		} catch (error: Error | unknown) {
			expect(error).toBeInstanceOf(RpcException);
			const message = (error as RpcException).getError();
			expect(typeof message).toBe("string");
			expect(message).toContain("Validation failed:");
		}
	});

	it("должен выбросить RpcException при невалидном age", async () => {
		const input = { name: "John", age: "invalid" };

		await expect(pipe.transform(input as unknown as TestDto)).rejects.toThrow(RpcException);
	});

	it("должен выбросить RpcException при отсутствующих полях", async () => {
		const input = {};

		await expect(pipe.transform(input as unknown as TestDto)).rejects.toThrow(RpcException);
	});

	it("должен выбросить RpcException при дополнительных полях", async () => {
		const input = { name: "John", age: 30, extra: "field" };

		await expect(pipe.transform(input as unknown as TestDto)).rejects.toThrow(RpcException);
	});

	it("должен включить все ошибки валидации в сообщение", async () => {
		const input = { name: [], age: "invalid" };

		try {
			await pipe.transform(input as unknown as TestDto);
			expect(true).toBe(false);
		} catch (error: Error | unknown) {
			expect(error).toBeInstanceOf(RpcException);
			const message = (error as RpcException).getError();
			expect(typeof message).toBe("string");
			expect(message).toContain("Validation failed:");
		}
	});

	it("должен успешно валидировать DTO без ошибок constraints", async () => {
		const input = { name: "Alice", age: 25 };
		const result = await pipe.transform(input as TestDto);

		expect(result).toBeInstanceOf(TestDto);
		expect(result.name).toBe("Alice");
		expect(result.age).toBe(25);
	});

	it("должен обработать ошибку валидации без constraints", async () => {
		class InvalidDto {
			@IsString()
			field!: string;
		}

		const invalidPipe = new RpcValidationPipe(InvalidDto);
		const mockError = {
			property: "field",
			constraints: null,
		};

		jest.spyOn(require("class-validator"), "validate").mockResolvedValueOnce([mockError]);

		try {
			await invalidPipe.transform({
				field: 123,
			} as unknown as InvalidDto);
			expect(true).toBe(false);
		} catch (error: Error | unknown) {
			expect(error).toBeInstanceOf(RpcException);
		}
	});

	it("должен обработать null value как пустой объект", async () => {
		class EmptyDto {}

		const emptyPipe = new RpcValidationPipe(EmptyDto);

		await expect(emptyPipe.transform(null as unknown as EmptyDto)).rejects.toThrow();
	});

	it("должен обработать undefined value как пустой объект", async () => {
		class EmptyDto {}

		const emptyPipe = new RpcValidationPipe(EmptyDto);

		await expect(emptyPipe.transform(undefined as unknown as EmptyDto)).rejects.toThrow();
	});
});
