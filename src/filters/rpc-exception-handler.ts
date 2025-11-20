import { LoggerService } from "@makebelieve21213-packages/logger";
import { ArgumentsHost, Optional } from "@nestjs/common";
import RpcError from "src/errors/rpc.error";

import type { RmqContext } from "@nestjs/microservices";
import type { RmqChannel, RmqMessage } from "src/types/rpc-types";

// Обработчик RPC ошибок, извлеченный из фильтра для переиспользования
export default class RpcExceptionFilter {
	private readonly MAX_RETRIES = 2;

	constructor(
		private readonly loggerService: LoggerService,
		@Optional()
		private readonly dlxExchange?: string
	) {
		this.dlxExchange = this.dlxExchange || "events_exchange.dlx";
	}

	// Обрабатывает RPC ошибку с поддержкой retry и DLX
	handleException(exception: Error | unknown, host: ArgumentsHost): void | Error {
		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(RpcExceptionFilter.name);
		const ctx: RmqContext | undefined = host.switchToRpc().getContext<RmqContext>();

		// Проверяем, что контекст имеет необходимые методы
		if (
			!ctx ||
			typeof ctx.getChannelRef !== "function" ||
			typeof ctx.getMessage !== "function" ||
			typeof ctx.getPattern !== "function"
		) {
			// Для невалидного RPC контекста пробрасываем оригинальную ошибку
			throw exception;
		}

		const channel: RmqChannel = ctx.getChannelRef();
		const msg: RmqMessage = ctx.getMessage();
		const pattern = ctx.getPattern() || "unknown";

		// Преобразуем любую ошибку в RpcError
		const rpcError = RpcError.fromUnknown(exception);

		// Считаем, сколько redeliver уже было
		const deathHeader = msg.properties?.headers?.["x-death"] || [];
		const retries = deathHeader[0]?.count || 0;

		// Определяем тип ошибки (временная или постоянная)
		const isTransient = rpcError.isTransient();

		this.loggerService.error(
			`RPC [${pattern}] ${rpcError.statusCode} — ${rpcError.name} — ${rpcError.errorType} — ${rpcError.message} [attempt: ${retries + 1}, type: ${isTransient ? "transient" : "permanent"}]. Stack: ${exception instanceof Error ? exception.stack || "" : ""}`
		);

		// Постоянная ошибка → сразу в DLX, не тратим попытки retry
		if (!isTransient) {
			throw this.sendToDLXAndThrow(channel, msg, pattern, rpcError);
		}

		// Временная ошибка → retry логика
		// (максимум 2 попытки, всего 3 включая первую)
		if (retries < this.MAX_RETRIES) {
			// NACK без requeue - сообщение отправится в retry очередь через DLX механизм
			// Retry очередь через TTL вернет сообщение обратно в основную очередь
			// для повторной обработки
			channel.nack(msg, false, false);

			this.loggerService.warn(
				`Transient error - message requeued for retry #${retries + 1} [pattern: ${pattern}]`
			);

			// НЕ выбрасываем ошибку - сообщение будет обработано повторно через retry механизм
			return;
		}

		// Превышен лимит попыток (3-я попытка) - отправляем в DLX
		throw this.sendToDLXAndThrow(channel, msg, pattern, rpcError);
	}

	// Отправка сообщения в DLX очередь и выбрасывание ошибки клиенту
	private sendToDLXAndThrow(
		channel: RmqChannel,
		msg: RmqMessage,
		pattern: string,
		rpcError: RpcError
	): RpcError {
		// Публикуем в DLX очередь
		channel.publish(
			this.dlxExchange,
			msg.fields?.routingKey || pattern,
			msg.content || Buffer.from(""),
			{
				headers: msg.properties?.headers,
			}
		);

		// Подтверждаем сообщение, чтобы оно удалилось из очереди
		channel.ack(msg);

		this.loggerService.warn(
			`Message sent to DLX [pattern: ${pattern}, error: ${rpcError.message}]`
		);

		// Выбрасываем ошибку для отправки клиенту
		throw rpcError;
	}
}
