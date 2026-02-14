import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { getUserFromContext } from "src/utils/context.utils";

import type { UserFromContext } from "src/types/context-types";

/**
 * Декоратор для получения req.user из запроса в хендлере контроллера
 * Требует аутентификации (например, JwtAuthGuard) для гарантированного наличия user
 */
export default function User<T = UserFromContext>(): ParameterDecorator {
	return createParamDecorator((_data: unknown, ctx: ExecutionContext): T | undefined => {
		return getUserFromContext(ctx) as T | undefined;
	}) as ParameterDecorator;
}
