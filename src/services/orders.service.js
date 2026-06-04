import { NotFoundError, ValidationError } from "../utils/errors.js";

export const ORDER_STATUSES = Object.freeze(["pending", "shipped", "delivered"]);

const DEFAULT_ORDER_STATUS = "pending";
const DEFAULT_LIST_LIMIT = 100;
const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_OFFSET = 0;

function validateRequiredString(fieldName, value, maxLength = 255) {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new ValidationError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function validateOptionalString(fieldName, value, maxLength = 255) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return validateRequiredString(fieldName, value, maxLength);
}

function validateStatus(status = DEFAULT_ORDER_STATUS) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ORDER_STATUSES.join(", ")}.`);
  }

  return status;
}

function validatePositiveInteger(fieldName, value) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }

  return numberValue;
}

function validateNonNegativeInteger(fieldName, value) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative integer.`);
  }

  return numberValue;
}

function validateListLimit(limit = DEFAULT_LIST_LIMIT) {
  const parsedLimit = validatePositiveInteger("limit", limit);

  if (parsedLimit > MAX_LIST_LIMIT) {
    throw new ValidationError(`limit must be ${MAX_LIST_LIMIT} or fewer.`);
  }

  return parsedLimit;
}

function normalizeCreateOrderInput(input = {}) {
  return {
    customerName: validateRequiredString("customerName", input.customerName),
    productName: validateRequiredString("productName", input.productName),
    status: validateStatus(input.status)
  };
}

function normalizeListOrdersInput(input = {}) {
  return {
    customerName: validateOptionalString("customerName", input.customerName),
    status: input.status === undefined ? undefined : validateStatus(input.status),
    limit: validateListLimit(input.limit),
    offset: validateNonNegativeInteger("offset", input.offset ?? DEFAULT_LIST_OFFSET)
  };
}

export class OrdersService {
  constructor({ ordersRepository }) {
    if (!ordersRepository) {
      throw new Error("OrdersService requires an orders repository.");
    }

    this.ordersRepository = ordersRepository;
  }

  async createOrder(input) {
    return this.ordersRepository.createOrder(normalizeCreateOrderInput(input));
  }

  async getOrder(id) {
    const orderId = validatePositiveInteger("id", id);
    const order = await this.ordersRepository.getOrder(orderId);

    if (!order) {
      throw new NotFoundError(`Order ${orderId} was not found.`);
    }

    return order;
  }

  async getOrders(input) {
    return this.ordersRepository.getOrders(normalizeListOrdersInput(input));
  }

  async updateOrderStatus(id, status) {
    const orderId = validatePositiveInteger("id", id);
    const order = await this.ordersRepository.updateOrder(orderId, {
      status: validateStatus(status)
    });

    if (!order) {
      throw new NotFoundError(`Order ${orderId} was not found.`);
    }

    return order;
  }

  async deleteOrder(id) {
    const orderId = validatePositiveInteger("id", id);
    const order = await this.ordersRepository.deleteOrder(orderId);

    if (!order) {
      throw new NotFoundError(`Order ${orderId} was not found.`);
    }

    return order;
  }
}

export default OrdersService;
