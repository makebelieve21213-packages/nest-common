import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "src/decorators/public.decorator";

// Guard для проверки JWT токена
@Injectable()
export default class JwtAuthGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> {
		// Проверяем, является ли эндпоинт публичным
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new UnauthorizedException("User not authenticated");
		}

		return true;
	}
}
