export { default as HttpValidationPipe } from "src/pipes/http-validation.pipe";
export { default as RpcValidationPipe } from "src/pipes/rpc-validation.pipe";
export { default as FileValidationPipe } from "src/pipes/file-validation.pipe";
export { default as QueryValidationPipe } from "src/pipes/query-validation.pipe";
export { default as HeaderValidationPipe } from "src/pipes/header-validation.pipe";

export { default as UnifiedExceptionFilter } from "src/filters/unified-exception.filter";

export { default as UnifiedInterceptor } from "src/interceptors/unified.interceptor";
export { default as ResponseInterceptor } from "src/interceptors/response.interceptor";
export { default as SerializeInterceptor } from "src/interceptors/serialize.interceptor";
export { default as CompressionInterceptor } from "src/interceptors/compression.interceptor";
export { default as RequestIdResponseInterceptor } from "src/interceptors/request-id-response.interceptor";

export { default as HttpError } from "src/errors/http.error";
export { default as RpcError } from "src/errors/rpc.error";
export { default as SocketError } from "src/errors/socket.error";
export { default as NestCommonError } from "src/errors/nest-common.error";

export { RpcErrorType } from "src/types/rpc-types";

export { default as BaseController } from "src/base/base.controller";

export { default as JwtAuthGuard } from "src/guards/jwt-auth.guard";
export { default as ApiKeyGuard } from "src/guards/api-key.guard";
export { default as RolesGuard } from "src/guards/roles.guard";
export { default as PermissionsGuard } from "src/guards/permissions.guard";
export { default as RateLimitGuard } from "src/guards/rate-limit.guard";
export {
	default as WebSocketAuthGuard,
	type TokenValidator,
} from "src/guards/websocket-auth.guard";

export { Public, IS_PUBLIC_KEY } from "src/decorators/public.decorator";
export { Roles, ROLES_KEY } from "src/decorators/roles.decorator";
export { Permissions, PERMISSIONS_KEY } from "src/decorators/permissions.decorator";
export { ApiKey, API_KEY_KEY } from "src/decorators/api-key.decorator";
export { Serialize, SERIALIZE_KEY } from "src/decorators/serialize.decorator";

export {
	getUserFromContext,
	getIpFromContext,
	getUserAgentFromContext,
	getRequestIdFromContext,
} from "src/utils/context.utils";
export type { UserFromContext } from "src/types/context-types";

export { default as createCorsOptions } from "src/utils/cors.utils";
export type { CorsOptionsConfig } from "src/types/cors-types";

export { default as createCompressionOptions } from "src/utils/compression.utils";
export type { CompressionOptionsConfig } from "src/types/compression-types";

export { default as createVersioningOptions } from "src/utils/versioning.utils";
export type { VersioningOptionsConfig, VersioningStrategy } from "src/types/versioning-types";

export { validateFile, getFileExtension, formatFileSize } from "src/utils/file.utils";
export type {
	FileValidationOptions,
	FileValidationResult,
} from "src/types/file-validation-types";

export type { MulterFile } from "src/types/file-types";

export { default as CircuitBreakerService } from "src/utils/circuit-breaker";
export {
	CircuitBreakerState,
	type CircuitBreakerOptions,
} from "src/types/circuit-breaker-types";

export { default as validateEnv } from "src/utils/env-validator";

export { default as getServicePath } from "src/utils/get-service-path";
export type { GetServicePathOptions, ServicePathType } from "src/types/get-service-path-types";

export type { StandardResponse } from "src/types/http-response";
