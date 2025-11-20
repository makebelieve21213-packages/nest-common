import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "src/decorators/roles.decorator";

// Guard для проверки ролей пользователя
@Injectable()
export default class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> {
		// Получаем требуемые роли из метаданных
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		// Если роли не указаны, разрешаем доступ
		if (!requiredRoles || !requiredRoles.length) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new ForbiddenException("User not authenticated");
		}

		// Проверяем наличие ролей у пользователя
		const userRoles = user.roles || [];

		const hasRole = requiredRoles.some((role) => userRoles.includes(role));

		if (!hasRole) {
			throw new ForbiddenException(
				"Insufficient permissions. Required roles: " + requiredRoles.join(", ")
			);
		}

		return true;
	}
}
