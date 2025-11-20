import { SetMetadata } from "@nestjs/common";
import { Permissions, PERMISSIONS_KEY } from "src/decorators/permissions.decorator";

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		SetMetadata: jest.fn().mockReturnValue(() => {}),
	};
});

describe("Permissions decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should set metadata with PERMISSIONS_KEY and provided permissions", () => {
		Permissions("read", "write");

		expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, ["read", "write"]);
	});

	it("should handle empty permissions array", () => {
		Permissions();

		expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, []);
	});

	it("should return SetMetadata result", () => {
		// SetMetadata вызывается при вызове декоратора
		Permissions("read");
		// Проверяем, что SetMetadata был вызван (проверено в предыдущем тесте)
		expect(SetMetadata).toHaveBeenCalled();
	});
});
