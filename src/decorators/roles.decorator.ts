import { SetMetadata } from "@nestjs/common";

// Ключ метаданных для ролей
export const ROLES_KEY = "roles";

// Декоратор для указания ролей, необходимых для доступа к эндпоинту
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
