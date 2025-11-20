import createCompressionOptions from "src/utils/compression.utils";

describe("compression.utils", () => {
	describe("createCompressionOptions", () => {
		it("should create default compression options", () => {
			const options = createCompressionOptions();

			expect(options).toMatchObject({
				level: 6,
				threshold: 1024,
				chunkSize: 16 * 1024,
				windowBits: 15,
				memLevel: 8,
			});
			expect(options.filter).toBeDefined();
		});

		it("should create compression options with custom config", () => {
			const customFilter = jest.fn().mockReturnValue(true);
			const options = createCompressionOptions({
				filter: customFilter,
				level: 9,
				threshold: 2048,
				chunkSize: 32 * 1024,
			});

			expect(options).toMatchObject({
				level: 9,
				threshold: 2048,
				chunkSize: 32 * 1024,
				windowBits: 15,
				memLevel: 8,
			});
			expect(options.filter).toBe(customFilter);
		});

		it("should include strategy when provided", () => {
			const options = createCompressionOptions({
				strategy: 1,
			});

			expect(options.strategy).toBe(1);
		});

		it("should include dictionary when provided", () => {
			const dictionary = Buffer.from("test");
			const options = createCompressionOptions({
				dictionary,
			});

			expect(options.dictionary).toBe(dictionary);
		});

		it("should use default filter that checks accept-encoding header", () => {
			const options = createCompressionOptions();
			const mockReq = {
				headers: {
					"accept-encoding": "gzip",
				},
			};
			const mockRes = {
				getHeader: jest.fn().mockReturnValue("application/json"),
			};

			if (options.filter) {
				const result = options.filter(mockReq as never, mockRes as never);

				expect(result).toBe(true);
				expect(mockRes.getHeader).toHaveBeenCalledWith("content-type");
			}
		});

		it("should return false in default filter when accept-encoding is not present", () => {
			const options = createCompressionOptions();
			const mockReq = {
				headers: {},
			};
			const mockRes = {
				getHeader: jest.fn(),
			};

			if (options.filter) {
				const result = options.filter(mockReq as never, mockRes as never);

				expect(result).toBe(false);
			}
		});

		it("should return false in default filter when content-type is not text-like", () => {
			const options = createCompressionOptions();
			const mockReq = {
				headers: {
					"accept-encoding": "gzip",
				},
			};
			const mockRes = {
				getHeader: jest.fn().mockReturnValue("application/octet-stream"),
			};

			if (options.filter) {
				const result = options.filter(mockReq as never, mockRes as never);

				expect(result).toBe(false);
			}
		});

		it("should handle content-type as non-string in default filter", () => {
			const options = createCompressionOptions();
			const mockReq = {
				headers: {
					"accept-encoding": "gzip",
				},
			};
			const mockRes = {
				getHeader: jest.fn().mockReturnValue(null),
			};

			if (options.filter) {
				const result = options.filter(mockReq as never, mockRes as never);

				expect(result).toBe(false);
			}
		});
	});
});
