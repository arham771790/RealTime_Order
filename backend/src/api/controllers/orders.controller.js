export class OrdersController {
  constructor({ ordersService }) {
    if (!ordersService) {
      throw new Error("OrdersController requires an orders service.");
    }

    this.ordersService = ordersService;
  }

  listOrders = async (request, response) => {
    const orders = await this.ordersService.getOrders({
      customerName: request.query.customerName,
      status: request.query.status,
      limit: request.query.limit,
      offset: request.query.offset
    });

    response.status(200).json({ data: orders });
  };

  getOrder = async (request, response) => {
    const order = await this.ordersService.getOrder(request.params.id);

    response.status(200).json({ data: order });
  };

  createOrder = async (request, response) => {
    const order = await this.ordersService.createOrder(request.body);

    response.status(201).json({ data: order });
  };

  updateOrderStatus = async (request, response) => {
    const order = await this.ordersService.updateOrderStatus(
      request.params.id,
      request.body.status
    );

    response.status(200).json({ data: order });
  };

  deleteOrder = async (request, response) => {
    await this.ordersService.deleteOrder(request.params.id);

    response.status(204).send();
  };
}

export default OrdersController;
