export class CircuitBreakerOpenError extends Error {
  constructor(message = "Circuit breaker is open.") {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.code = "CIRCUIT_BREAKER_OPEN";
  }
}

export class CircuitBreaker {
  constructor({ failureThreshold = 3, nowFn = Date.now, resetTimeoutMs = 30000 } = {}) {
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.nextAttemptAt = 0;
    this.nowFn = nowFn;
    this.resetTimeoutMs = resetTimeoutMs;
    this.state = "closed";
  }

  canExecute() {
    if (this.state !== "open") {
      return true;
    }

    if (this.nowFn() >= this.nextAttemptAt) {
      this.state = "half_open";
      return true;
    }

    return false;
  }

  async execute(operation) {
    if (!this.canExecute()) {
      throw new CircuitBreakerOpenError();
    }

    try {
      const result = await operation();
      this.recordSuccess();

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess() {
    this.failureCount = 0;
    this.nextAttemptAt = 0;
    this.state = "closed";
  }

  recordFailure() {
    this.failureCount += 1;

    if (this.state === "half_open" || this.failureCount >= this.failureThreshold) {
      this.state = "open";
      this.nextAttemptAt = this.nowFn() + this.resetTimeoutMs;
    }
  }
}

export default CircuitBreaker;
