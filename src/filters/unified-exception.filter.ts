import { LoggerService } from "@makebelieve21213-packages/logger";
import { ArgumentsHost, Catch, ExceptionFilter, Optional } from "@nestjs/common";
import HttpExceptionFilter from "src/filters/http-exception-handler";
import RpcExceptionFilter from "src/filters/rpc-exception-handler";
import WebSocketExceptionHandler from "src/filters/websocket-exception-handler";
import { ContextType } from "src/types/context-types";

// Единый глобальный фильтр для обработки ошибок HTTP, RPC и WebSocket контекстов
@Catch()
export default class UnifiedExceptionFilter implements ExceptionFilter {
	private readonly httpFilter: HttpExceptionFilter;
	private readonly rpcFilter: RpcExceptionFilter;
	private readonly wsHandler: WebSocketExceptionHandler;

	constructor(
		private readonly loggerService: LoggerService,
		@Optional()
		private readonly dlxExchange?: string
	) {
		this.loggerService.setContext(UnifiedExceptionFilter.name);

		this.httpFilter = new HttpExceptionFilter(this.loggerService);
		this.rpcFilter = new RpcExceptionFilter(this.loggerService, this.dlxExchange);
		this.wsHandler = new WebSocketExceptionHandler(this.loggerService);
	}

	catch(exception: Error | unknown, host: ArgumentsHost): void | Error {
		// Получаем тип контекста
		const contextType = host.getType();

		switch (contextType) {
			case ContextType.HTTP:
				// Обрабатываем HTTP контекст
				this.httpFilter.handleException(exception, host);
				return;

			case ContextType.RPC:
				// Обрабатываем RPC контекст
				this.rpcFilter.handleException(exception, host);
				return;

			case ContextType.WS:
				// Обрабатываем WebSocket контекст
				this.wsHandler.handleException(exception, host);
				return;

			default:
				// Для неизвестных контекстов пробрасываем оригинальную ошибку
				throw exception;
		}
	}
}
