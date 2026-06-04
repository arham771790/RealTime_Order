import { EventEmitter } from "node:events";

import pg from "pg";

import env from "../config/env.js";

const { Client } = pg;
const DEFAULT_CHANNEL = "order_changes";
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;

function validateChannel(channel) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(channel)) {
    throw new Error("LISTEN channel must be a valid PostgreSQL identifier.");
  }

  return channel;
}

export class DBChangeListener extends EventEmitter {
  constructor({
    connectionString = env.database.url,
    channel = DEFAULT_CHANNEL,
    ClientClass = Client,
    logger = console,
    reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
    maxReconnectDelayMs = DEFAULT_MAX_RECONNECT_DELAY_MS,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout
  } = {}) {
    super();

    this.connectionString = connectionString;
    this.channel = validateChannel(channel);
    this.ClientClass = ClientClass;
    this.logger = logger;
    this.reconnectDelayMs = reconnectDelayMs;
    this.maxReconnectDelayMs = maxReconnectDelayMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.client = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.isRunning = false;

    this.handleNotification = this.handleNotification.bind(this);
    this.handleClientError = this.handleClientError.bind(this);
    this.handleClientEnd = this.handleClientEnd.bind(this);
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.connect();
  }

  async connect() {
    const client = new this.ClientClass({
      connectionString: this.connectionString
    });

    client.on("notification", this.handleNotification);
    client.on("error", this.handleClientError);
    client.on("end", this.handleClientEnd);

    await client.connect();
    await client.query(`LISTEN ${this.channel}`);

    this.client = client;
    this.reconnectAttempt = 0;
    this.logger.info({ event: "db_listener_connected", channel: this.channel });
  }

  handleNotification(message) {
    if (message.channel !== this.channel) {
      return;
    }

    try {
      const payload = JSON.parse(message.payload);
      this.emit("change", payload);
      this.logger.info({ event: "db_notification_received", channel: this.channel });
    } catch (error) {
      this.logger.error({
        event: "db_notification_parse_failed",
        channel: this.channel,
        error: error.message
      });
    }
  }

  handleClientError(error) {
    this.logger.error({
      event: "db_listener_error",
      channel: this.channel,
      error: error.message
    });
    this.scheduleReconnect();
  }

  handleClientEnd() {
    this.logger.warn({ event: "db_listener_ended", channel: this.channel });
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (!this.isRunning || this.reconnectTimer) {
      return;
    }

    const delayMs = Math.min(
      this.reconnectDelayMs * 2 ** this.reconnectAttempt,
      this.maxReconnectDelayMs
    );

    this.reconnectTimer = this.setTimeoutFn(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempt += 1;

      try {
        await this.disconnectClient({ unlisten: false });
        await this.connect();
      } catch (error) {
        this.logger.error({
          event: "db_listener_reconnect_failed",
          channel: this.channel,
          error: error.message
        });
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  async stop() {
    this.isRunning = false;

    if (this.reconnectTimer) {
      this.clearTimeoutFn(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.disconnectClient({ unlisten: true });
    this.logger.info({ event: "db_listener_stopped", channel: this.channel });
  }

  async disconnectClient({ unlisten }) {
    const client = this.client;

    if (!client) {
      return;
    }

    this.client = null;
    client.off("notification", this.handleNotification);
    client.off("error", this.handleClientError);
    client.off("end", this.handleClientEnd);

    if (unlisten) {
      try {
        await client.query(`UNLISTEN ${this.channel}`);
      } catch (error) {
        this.logger.warn({
          event: "db_listener_unlisten_failed",
          channel: this.channel,
          error: error.message
        });
      }
    }

    await client.end();
  }
}

export default DBChangeListener;
