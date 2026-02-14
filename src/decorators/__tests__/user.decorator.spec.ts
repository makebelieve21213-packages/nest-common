import User from "src/decorators/user.decorator";
import * as contextUtils from "src/utils/context.utils";

import type { ExecutionContext } from "@nestjs/common";

let capturedFactory: ((data: unknown, ctx: ExecutionContext) => unknown) | null = null;

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		createParamDecorator: (factory: (data: unknown, ctx: ExecutionContext) => unknown) => {
			capturedFactory = factory;
			return () => () => {};
		},
	};
});

describe("User decorator", () => {
	beforeEach(() => {
		capturedFactory = null;
	});

	it("should return a parameter decorator when called", () => {
		const decorator = User();
		expect(typeof decorator).toBe("function");
	});

	it("should not throw when applied to a class method parameter", () => {
		class TestController {
			getUser(@User() user: unknown) {
				return user;
			}
		}
		expect(TestController).toBeDefined();
	});

	it("should support generic type parameter", () => {
		interface CustomUser {
			id: string;
			name: string;
		}
		const decorator = User<CustomUser>();
		expect(typeof decorator).toBe("function");

		class TestController {
			getUser(@User<CustomUser>() user: CustomUser | undefined) {
				return user;
			}
		}
		expect(TestController).toBeDefined();
	});

	it("should call getUserFromContext and return user when factory is invoked", () => {
		const mockUser = { id: "1", email: "test@test.com", roles: ["admin"] };
		const mockContext: ExecutionContext = {
			switchToHttp: () => ({
				getRequest: () => ({ user: mockUser }),
			}),
		} as unknown as ExecutionContext;

		class TestController {
			getUser(@User() _user: unknown) {
				return _user;
			}
		}
		expect(TestController).toBeDefined();

		expect(capturedFactory).toBeDefined();
		expect(typeof capturedFactory).toBe("function");
		const result = capturedFactory?.(undefined, mockContext);

		expect(result).toEqual(mockUser);
	});

	it("should return undefined when user is not in request", () => {
		const mockContext: ExecutionContext = {
			switchToHttp: () => ({
				getRequest: () => ({}),
			}),
		} as unknown as ExecutionContext;

		class TestController {
			getUser(@User() _user: unknown) {
				return _user;
			}
		}
		expect(TestController).toBeDefined();

		const result = capturedFactory?.(undefined, mockContext);

		expect(result).toBeUndefined();
	});

	it("should invoke getUserFromContext when factory runs", () => {
		const getUserSpy = jest.spyOn(contextUtils, "getUserFromContext");
		const mockUser = { id: "2", email: "user@example.com" };
		const mockContext: ExecutionContext = {
			switchToHttp: () => ({
				getRequest: () => ({ user: mockUser }),
			}),
		} as unknown as ExecutionContext;

		class TestController {
			getUser(@User() _user: unknown) {
				return _user;
			}
		}
		expect(TestController).toBeDefined();

		capturedFactory?.(undefined, mockContext);

		expect(getUserSpy).toHaveBeenCalledWith(mockContext);
		expect(getUserSpy).toHaveBeenCalledTimes(1);

		getUserSpy.mockRestore();
	});
});
