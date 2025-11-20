import { validateFile, getFileExtension, formatFileSize } from "src/utils/file.utils";

import type { MulterFile } from "src/types/file-types";

describe("file.utils", () => {
	describe("validateFile", () => {
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

		it("should validate file with default options", () => {
			const file = createMockFile(1024, "image/jpeg", "test.jpg");
			const result = validateFile(file);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject file exceeding max size", () => {
			const file = createMockFile(11 * 1024 * 1024, "image/jpeg", "test.jpg");
			const result = validateFile(file, { maxSize: 10 * 1024 * 1024 });

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("exceeds maximum");
		});

		it("should reject file with invalid MIME type", () => {
			const file = createMockFile(1024, "application/pdf", "test.pdf");
			const result = validateFile(file, {
				allowedMimeTypes: ["image/jpeg", "image/png"],
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("not allowed");
		});

		it("should reject file with invalid extension", () => {
			const file = createMockFile(1024, "image/jpeg", "test.exe");
			const result = validateFile(file, {
				allowedExtensions: ["jpg", "png"],
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("not allowed");
		});

		it("should handle file without extension", () => {
			// Файл с точкой в конце, но без расширения - pop() вернет пустую строку
			// Пустая строка является falsy, поэтому в сообщении будет использоваться "unknown"
			const file = createMockFile(1024, "image/jpeg", "test.");
			const result = validateFile(file, {
				allowedExtensions: ["jpg", "png"],
			});

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			// fileExtension будет пустой строкой "", что является falsy,
			// поэтому используется "unknown"
			expect(result.errors[0]).toContain("unknown");
		});

		it("should validate file with all constraints", () => {
			const file = createMockFile(1024, "image/jpeg", "test.jpg");
			const result = validateFile(file, {
				maxSize: 10 * 1024 * 1024,
				allowedMimeTypes: ["image/jpeg", "image/png"],
				allowedExtensions: ["jpg", "jpeg", "png"],
			});

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("getFileExtension", () => {
		it("should extract extension from filename", () => {
			expect(getFileExtension("test.jpg")).toBe("jpg");
			expect(getFileExtension("test.file.png")).toBe("png");
			expect(getFileExtension("test")).toBe("");
		});

		it("should return lowercase extension", () => {
			expect(getFileExtension("test.JPG")).toBe("jpg");
			expect(getFileExtension("test.PNG")).toBe("png");
		});
	});

	describe("formatFileSize", () => {
		it("should format bytes", () => {
			expect(formatFileSize(0)).toBe("0 Bytes");
			expect(formatFileSize(1024)).toBe("1 KB");
			expect(formatFileSize(1024 * 1024)).toBe("1 MB");
			expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
		});

		it("should format decimal sizes", () => {
			expect(formatFileSize(1536)).toBe("1.5 KB");
			expect(formatFileSize(2560)).toBe("2.5 KB");
		});
	});
});
