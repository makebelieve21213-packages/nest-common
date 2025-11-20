import { VersioningType } from "@nestjs/common";
import createVersioningOptions from "src/utils/versioning.utils";

describe("versioning.utils", () => {
	describe("createVersioningOptions", () => {
		it("should create URI versioning options", () => {
			const options = createVersioningOptions({
				type: "uri",
				defaultVersion: "1",
				key: "v",
			});

			expect(options).toEqual({
				type: VersioningType.URI,
				defaultVersion: "1",
			});
		});

		it("should create header versioning options", () => {
			const options = createVersioningOptions({
				type: "header",
				defaultVersion: "2",
				header: "X-API-Version",
			});

			expect(options).toEqual({
				type: VersioningType.HEADER,
				defaultVersion: "2",
				header: "X-API-Version",
			});
		});

		it("should create media-type versioning options", () => {
			const options = createVersioningOptions({
				type: "media-type",
				defaultVersion: "1",
			});

			expect(options).toEqual({
				type: VersioningType.MEDIA_TYPE,
				defaultVersion: "1",
				key: "v",
			});
		});

		it("should use default header name", () => {
			const options = createVersioningOptions({
				type: "header",
			});

			expect(options).toEqual({
				type: VersioningType.HEADER,
				header: "X-API-Version",
			});
		});

		it("should use default key for URI versioning", () => {
			const options = createVersioningOptions({
				type: "uri",
			});

			expect(options).toEqual({
				type: VersioningType.URI,
			});
		});

		it("should return default URI versioning for unknown type", () => {
			const options = createVersioningOptions({
				type: "unknown" as never,
				defaultVersion: "1",
			});

			expect(options.type).toBe(VersioningType.URI);
			expect(options.defaultVersion).toBe("1");
		});
	});
});
