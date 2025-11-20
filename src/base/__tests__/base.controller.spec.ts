import BaseController from "src/base/base.controller";

import type { RmqContext } from "@nestjs/microservices";

class TestController extends BaseController {
	testAcknowledge(ctx: RmqContext): void {
		this.acknowledge(ctx);
	}
}

describe("BaseController", () => {
	let controller: TestController;
	let mockLogger: {
		setContext: jest.Mock;
		log: jest.Mock;
		error: jest.Mock;
		warn: jest.Mock;
	};
	let mockRmqContext: jest.Mocked<RmqContext>;
	let mockChannel: {
		ack: jest.Mock;
		nack: jest.Mock;
	};
	let mockMessage: {
		properties: Record<string, unknown>;
		fields: Record<string, unknown>;
		content: Buffer;
	};

	beforeEach(async () => {
		mockLogger = {
			setContext: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
		};

		mockChannel = {
			ack: jest.fn(),
			nack: jest.fn(),
		};

		mockMessage = {
			properties: {},
			fields: {},
			content: Buffer.from("test"),
		};

		mockRmqContext = {
			getChannelRef: jest.fn().mockReturnValue(mockChannel),
			getMessage: jest.fn().mockReturnValue(mockMessage),
			getPattern: jest.fn(),
		} as unknown as jest.Mocked<RmqContext>;

		controller = new TestController(mockLogger as never);
	});

	describe("constructor", () => {
		it("должен установить контекст логирования", () => {
			expect(mockLogger.setContext).toHaveBeenCalledWith("TestController");
		});
	});

	describe("acknowledge", () => {
		it("должен вызвать ack на канале RabbitMQ", () => {
			controller.testAcknowledge(mockRmqContext);

			expect(mockRmqContext.getChannelRef).toHaveBeenCalled();
			expect(mockRmqContext.getMessage).toHaveBeenCalled();
			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});
	});
});
