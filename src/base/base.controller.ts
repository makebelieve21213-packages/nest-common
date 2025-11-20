import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { RmqContext } from "@nestjs/microservices";

// Базовый контроллер для обработки RPC и HTTP сообщений
export default abstract class BaseController {
	constructor(protected readonly logger: LoggerService) {
		this.logger.setContext(this.constructor.name);
	}

	// Отправка acknowledge сообщения в RPC
	protected acknowledge(ctx: RmqContext): void {
		const channel = ctx.getChannelRef();
		const originalMsg = ctx.getMessage();
		channel.ack(originalMsg);
	}
}
