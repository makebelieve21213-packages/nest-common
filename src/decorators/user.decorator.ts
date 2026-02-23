import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { ExtendedRequest, UserFromContext } from "src/types/context-types";

/**
 * Декоратор для получения req.user из запроса в хендлере контроллера.
 * Требует аутентификации (например, AuthGuard от Passport) для гарантированного наличия user.
 *
 * Использует getArgByIndex(0) для получения request — тот же источник, что и @Req().
 * В цепочке Guard → Interceptors → Pipes (param decorator) это гарантирует чтение
 * request из аргументов текущего вызова хендлера.
 */
export default function User<T = UserFromContext>(): ParameterDecorator {
	return createParamDecorator((_data: unknown, ctx: ExecutionContext): T | undefined => {
		const request = ctx.getArgByIndex(0) as ExtendedRequest | undefined;
		return request?.user as T | undefined;
	}) as ParameterDecorator;
}
