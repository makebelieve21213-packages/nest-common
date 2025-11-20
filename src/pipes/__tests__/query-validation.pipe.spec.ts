import { ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsString, IsNumber, Min, ValidateNested } from "class-validator";
import QueryValidationPipe from "src/pipes/query-validation.pipe";

class TestQueryDto {
	@IsString()
	name!: string;

	@IsNumber()
	@Min(0)
	age!: number;
}

class NestedDto {
	@IsString()
	nestedField!: string;
}

class TestQueryDtoWithNested {
	@IsString()
	name!: string;

	@ValidateNested()
	@Type(() => NestedDto)
	nested!: NestedDto;
}

describe("QueryValidationPipe", () => {
	let pipe: QueryValidationPipe;

	beforeEach(() => {
		pipe = new QueryValidationPipe(TestQueryDto);
	});

	it("should validate query parameters", async () => {
		const query = { name: "test", age: 25 };
		const metadata: ArgumentMetadata = {
			type: "query",
			data: "",
		};

		const result = await pipe.transform(query, metadata);

		expect(result).toBeInstanceOf(TestQueryDto);
		expect((result as TestQueryDto).name).toBe("test");
		expect((result as TestQueryDto).age).toBe(25);
	});

	it("should throw BadRequestException for invalid query parameters", async () => {
		const query = { name: 123, age: -5 };
		const metadata: ArgumentMetadata = {
			type: "query",
			data: "",
		};

		await expect(pipe.transform(query, metadata)).rejects.toThrow(BadRequestException);
	});

	it("should return value as-is for non-query metadata", async () => {
		const value = { test: "value" };
		const metadata: ArgumentMetadata = {
			type: "body",
			data: "",
		};

		const result = await pipe.transform(value, metadata);

		expect(result).toBe(value);
	});

	it("should return value as-is when dtoClass is not provided", async () => {
		const pipeWithoutDto = new QueryValidationPipe(undefined as unknown as new () => unknown);
		const query = { name: "test" };
		const metadata: ArgumentMetadata = {
			type: "query",
			data: "",
		};

		const result = await pipeWithoutDto.transform(query, metadata);

		expect(result).toBe(query);
	});

	it("should format nested validation errors", async () => {
		const pipeWithNested = new QueryValidationPipe(TestQueryDtoWithNested);
		const query = {
			name: "test",
			nested: { nestedField: 123 }, // невалидное значение
		};
		const metadata: ArgumentMetadata = {
			type: "query",
			data: "",
		};

		await expect(pipeWithNested.transform(query, metadata)).rejects.toThrow(BadRequestException);
	});
});
