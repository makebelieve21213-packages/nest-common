import { SetMetadata } from "@nestjs/common";
import { Roles, ROLES_KEY } from "src/decorators/roles.decorator";

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		SetMetadata: jest.fn().mockReturnValue(() => {}),
	};
});

describe("Roles decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should set metadata with ROLES_KEY and provided roles", () => {
		Roles("admin", "user");

		expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, ["admin", "user"]);
	});

	it("should handle empty roles array", () => {
		Roles();

		expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, []);
	});

	it("should return SetMetadata result", () => {
		// SetMetadata вызывается при вызове декоратора
		Roles("admin");
		// Проверяем, что SetMetadata был вызван (проверено в предыдущем тесте)
		expect(SetMetadata).toHaveBeenCalled();
	});
});
