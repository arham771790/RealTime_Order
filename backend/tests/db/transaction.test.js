import { jest } from "@jest/globals";

import { withTransaction } from "../../src/db/transaction.js";

function createPool() {
  const client = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn()
  };

  return {
    client,
    pool: {
      connect: jest.fn().mockResolvedValue(client)
    }
  };
}

describe("withTransaction", () => {
  it("commits successful operations and releases the client", async () => {
    const { client, pool } = createPool();

    const result = await withTransaction(pool, async () => "ok");

    expect(result).toBe("ok");
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back failed operations and releases the client", async () => {
    const { client, pool } = createPool();
    const error = new Error("boom");

    await expect(
      withTransaction(pool, async () => {
        throw error;
      })
    ).rejects.toThrow("boom");

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
