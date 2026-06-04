import { jest } from "@jest/globals";

import { SocketRedisAdapter } from "../../src/sockets/socket-redis-adapter.js";

function createRedisClient() {
  return {
    connect: jest.fn().mockResolvedValue(),
    quit: jest.fn().mockResolvedValue()
  };
}

function createIo() {
  return {
    adapter: jest.fn()
  };
}

describe("SocketRedisAdapter", () => {
  it("requires Socket.IO and Redis clients", () => {
    expect(() => new SocketRedisAdapter()).toThrow(
      "SocketRedisAdapter requires a Socket.IO server."
    );
    expect(() => new SocketRedisAdapter({ io: createIo() })).toThrow(
      "SocketRedisAdapter requires a Redis publish client."
    );
    expect(
      () => new SocketRedisAdapter({ io: createIo(), pubClient: createRedisClient() })
    ).toThrow("SocketRedisAdapter requires a Redis subscribe client.");
  });

  it("connects Redis clients and installs the Socket.IO adapter", async () => {
    const io = createIo();
    const pubClient = createRedisClient();
    const subClient = createRedisClient();
    const adapterFactoryResult = jest.fn();
    const createAdapterFn = jest.fn(() => adapterFactoryResult);
    const socketRedisAdapter = new SocketRedisAdapter({
      createAdapterFn,
      io,
      pubClient,
      subClient
    });

    await socketRedisAdapter.connect();

    expect(pubClient.connect).toHaveBeenCalledTimes(1);
    expect(subClient.connect).toHaveBeenCalledTimes(1);
    expect(createAdapterFn).toHaveBeenCalledWith(pubClient, subClient);
    expect(io.adapter).toHaveBeenCalledWith(adapterFactoryResult);
  });

  it("closes Redis clients", async () => {
    const pubClient = createRedisClient();
    const subClient = createRedisClient();
    const socketRedisAdapter = new SocketRedisAdapter({
      createAdapterFn: jest.fn(() => jest.fn()),
      io: createIo(),
      pubClient,
      subClient
    });

    await socketRedisAdapter.connect();
    await socketRedisAdapter.close();

    expect(pubClient.quit).toHaveBeenCalledTimes(1);
    expect(subClient.quit).toHaveBeenCalledTimes(1);
  });
});
