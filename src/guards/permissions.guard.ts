import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "src/decorators/permissions.decorator";

// Guard для проверки разрешений пользователя
@Injectable()
export default class PermissionsGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> {
		// Получаем требуемые разрешения из метаданных
		const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		// Если разрешения не указаны, разрешаем доступ
		if (!requiredPermissions || !requiredPermissions.length) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new ForbiddenException("User not authenticated");
		}

		// Проверяем наличие разрешений у пользователя
		const userPermissions = user.permissions || [];

		const hasAllPermissions = requiredPermissions.every((permission) =>
			userPermissions.includes(permission)
		);

		if (!hasAllPermissions) {
			throw new ForbiddenException(
				"Insufficient permissions. Required permissions: " + requiredPermissions.join(", ")
			);
		}

		return true;
	}
}
