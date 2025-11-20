import {
	CanActivate,
	ExecutionContext,
	Injectable,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "src/decorators/public.decorator";
import { getIpFromContext } from "src/utils/context.utils";

import type { RateLimitInfo } from "src/types/guard-types";

// Guard для ограничения частоты запросов (Rate Limiting)
@Injectable()
export default class RateLimitGuard implements CanActivate {
	private readonly store = new Map<string, RateLimitInfo>();

	constructor(
		private readonly reflector: Reflector,
		private readonly maxRequests: number = 100,
		private readonly windowMs: number = 60000, // 1 минута по умолчанию
		private readonly keyGenerator?: (context: ExecutionContext) => string
	) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> {
		// Проверяем, является ли эндпоинт публичным
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			// Для публичных эндпоинтов применяем более строгие лимиты
			return this.checkRateLimit(context, this.maxRequests / 2);
		}

		return this.checkRateLimit(context, this.maxRequests);
	}

	private checkRateLimit(context: ExecutionContext, maxRequests: number): boolean {
		const key = this.getKey(context);
		const now = Date.now();
		const info = this.store.get(key);

		// Очищаем устаревшие записи
		this.cleanup();

		if (!info || now > info.resetTime) {
			// Создаем новую запись
			this.store.set(key, {
				count: 1,
				resetTime: now + this.windowMs,
			});
			return true;
		}

		if (info.count >= maxRequests) {
			throw new HttpException(
				{
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					message: "Too many requests, please try again later",
					retryAfter: Math.ceil((info.resetTime - now) / 1000),
				},
				HttpStatus.TOO_MANY_REQUESTS
			);
		}

		// Увеличиваем счетчик
		info.count++;
		return true;
	}

	private getKey(context: ExecutionContext): string {
		if (this.keyGenerator) {
			return this.keyGenerator(context);
		}

		// По умолчанию используем IP адрес
		const ip = getIpFromContext(context);
		const request = context.switchToHttp().getRequest();
		const path = request.url || request.path || "";

		return `${ip}:${path}`;
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, info] of this.store.entries()) {
			if (now > info.resetTime) {
				this.store.delete(key);
			}
		}
	}
}
