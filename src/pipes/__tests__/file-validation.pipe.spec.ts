import { BadRequestException } from "@nestjs/common";
import FileValidationPipe from "src/pipes/file-validation.pipe";

import type { ArgumentMetadata } from "@nestjs/common";
import type { MulterFile } from "src/types/file-types";

describe("FileValidationPipe", () => {
	let pipe: FileValidationPipe;

	const createMockFile = (
		size: number,
		mimetype: string,
		originalname: string
	): MulterFile => ({
		fieldname: "file",
		originalname,
		encoding: "7bit",
		mimetype,
		size,
		buffer: Buffer.from("test"),
		destination: "",
		filename: "",
		path: "",
		stream: null as unknown as NodeJS.ReadableStream,
	});

	beforeEach(() => {
		pipe = new FileValidationPipe();
	});

	it("should validate single file", () => {
		const file = createMockFile(1024, "image/jpeg", "test.jpg");
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "file",
		};

		const result = pipe.transform(file, metadata);

		expect(result).toBe(file);
	});

	it("should validate array of files", () => {
		const files = [
			createMockFile(1024, "image/jpeg", "test1.jpg"),
			createMockFile(2048, "image/png", "test2.png"),
		];
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "files",
		};

		const result = pipe.transform(files, metadata);

		expect(result).toEqual(files);
	});

	it("should throw BadRequestException when file is invalid", () => {
		const file = createMockFile(11 * 1024 * 1024, "image/jpeg", "test.jpg");
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "file",
		};

		pipe = new FileValidationPipe({ maxSize: 10 * 1024 * 1024 });

		expect(() => pipe.transform(file, metadata)).toThrow(BadRequestException);
		expect(() => pipe.transform(file, metadata)).toThrow("File validation failed");
	});

	it("should throw BadRequestException when no file provided", () => {
		const metadata: ArgumentMetadata = {
			type: "custom",
			data: "file",
		};

		expect(() => pipe.transform(null as unknown as MulterFile, metadata)).toThrow(
			BadRequestException
		);
		expect(() => pipe.transform(null as unknown as MulterFile, metadata)).toThrow(
			"No file provided"
		);
	});
});
