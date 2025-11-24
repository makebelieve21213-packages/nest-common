import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { API_KEY_KEY } from "src/decorators/api-key.decorator";
import { IS_PUBLIC_KEY } from "src/decorators/public.decorator";

// Guard для проверки API ключа
@Injectable()
export default class ApiKeyGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly apiKeyHeader: string = "x-api-key",
		private readonly validApiKeys?: Set<string>
	) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> {
		// Проверяем, является ли эндпоинт публичным
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		// Проверяем, требуется ли API ключ для этого эндпоинта
		const requiresApiKey = this.reflector.getAllAndOverride<boolean>(API_KEY_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiresApiKey) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const apiKey = request.headers[this.apiKeyHeader.toLowerCase()];

		if (!apiKey) {
			throw new UnauthorizedException("API key is required");
		}

		// Если указан список валидных ключей, проверяем его
		if (this.validApiKeys && !this.validApiKeys.has(apiKey)) {
			throw new UnauthorizedException("Invalid API key");
		}

		return true;
	}
}
