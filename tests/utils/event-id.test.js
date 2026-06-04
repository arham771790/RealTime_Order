import { ensureEventId } from "../../src/utils/event-id.js";

describe("event id utilities", () => {
  it("preserves existing event ids", () => {
    const event = { eventId: "evt-1", operation: "UPDATE" };

    expect(ensureEventId(event)).toBe(event);
  });

  it("adds a UUID event id when one is missing", () => {
    const event = ensureEventId({ operation: "UPDATE" });

    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
    );
  });
});
