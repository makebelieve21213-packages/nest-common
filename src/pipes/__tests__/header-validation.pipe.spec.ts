import { ArgumentMetadata, BadRequestException, HttpStatus } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested } from "class-validator";
import HeaderValidationPipe from "src/pipes/header-validation.pipe";

class TestHeaderDto {
	@IsString()
	authorization!: string;

	@IsString()
	@IsOptional()
	"x-request-id"?: string;
}

class NestedDto {
	@IsString()
	nestedField!: string;
}

class TestHeaderDtoWithNested {
	@IsString()
	authorization!: string;

	@ValidateNested()
	@Type(() => NestedDto)
	nested!: NestedDto;
}

describe("HeaderValidationPipe", () => {
	let pipe: HeaderValidationPipe;

	beforeEach(() => {
		pipe = new HeaderValidationPipe(TestHeaderDto);
	});

	it("should validate headers", async () => {
		const headers = { authorization: "Bearer token" };
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "",
		};

		const result = await pipe.transform(headers, metadata);

		expect(result).toBeInstanceOf(TestHeaderDto);
		expect((result as TestHeaderDto).authorization).toBe("Bearer token");
	});

	it("should throw BadRequestException for invalid headers", async () => {
		const headers = { authorization: 123 };
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "",
		};

		await expect(pipe.transform(headers, metadata)).rejects.toThrow(BadRequestException);

		try {
			await pipe.transform(headers, metadata);
		} catch (error: Error | unknown) {
			expect(error).toBeInstanceOf(BadRequestException);
			if (error instanceof BadRequestException) {
				expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			}
		}
	});

	it("should return value as-is for non-custom metadata", async () => {
		const value = { test: "value" };
		const metadata: ArgumentMetadata = {
			type: "body",
			data: "",
		};

		const result = await pipe.transform(value, metadata);

		expect(result).toBe(value);
	});

	it("should return value as-is when dtoClass is not provided", async () => {
		const pipeWithoutDto = new HeaderValidationPipe(undefined as unknown as new () => unknown);
		const headers = { authorization: "Bearer token" };
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "",
		};

		const result = await pipeWithoutDto.transform(headers, metadata);

		expect(result).toBe(headers);
	});

	it("should format nested validation errors", async () => {
		const pipeWithNested = new HeaderValidationPipe(TestHeaderDtoWithNested);
		const headers = {
			authorization: "Bearer token",
			nested: { nestedField: 123 }, // невалидное значение
		};
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "",
		};

		await expect(pipeWithNested.transform(headers, metadata)).rejects.toThrow(
			BadRequestException
		);
	});
});
