// Типы ошибок, используемые в системе обработки исключений
export enum ErrorType {
	HTTP_ERROR = "HttpError",
	SOCKET_ERROR = "SocketError",
	RPC_ERROR = "RpcError",
	RPC_EXCEPTION = "RpcException",
	HTTP_EXCEPTION = "HttpException",
	ERROR = "Error",
	DESERIALIZED_RPC_ERROR = "DeserializedRpcError",
	NEST_RPC_EXCEPTION = "NestRpcException",
	OBJECT = "Object",
	UNKNOWN = "Unknown",
}
