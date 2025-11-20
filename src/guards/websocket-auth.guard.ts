import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";

// Тип коллбека для проверки токена
export type TokenValidator = (
	token: string,
	context: ExecutionContext
) => boolean | Promise<boolean>;

// Guard для проверки аутентификации при подключении к WebSocket
@Injectable()
export default class WebSocketAuthGuard implements CanActivate {
	constructor(private readonly tokenValidator?: TokenValidator) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const data = context.switchToWs().getData();

		// Проверяем наличие токена в данных подключения
		const token = data?.token || client.handshake?.auth?.token;

		if (!token) {
			throw new WsException("Authentication token is required");
		}

		// Если передан коллбек для проверки токена, вызываем его
		if (this.tokenValidator) {
			const isValid = await this.tokenValidator(token, context);

			if (!isValid) {
				throw new WsException("Invalid authentication token");
			}
		}

		return true;
	}
}
