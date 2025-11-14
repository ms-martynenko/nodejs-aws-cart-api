import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Order } from '../models';
import { CreateOrderPayload, OrderStatus } from '../type';

@Injectable()
export class OrderService {
  private orders: Record<string, Order> = {};

  async getAll(): Promise<Order[]> {
    return Object.values(this.orders);
  }

  async findById(orderId: string): Promise<Order> {
    return this.orders[orderId];
  }

  async create(data: CreateOrderPayload): Promise<Order> {
    const id = randomUUID() as string;
    const order: Order = {
      id,
      ...data,
      statusHistory: [
        {
          comment: '',
          status: OrderStatus.Open,
          timestamp: Date.now(),
        },
      ],
    };

    this.orders[id] = order;

    return order;
  }

  // TODO add  type
  update(orderId: string, data: Order) {
    const order = this.findById(orderId);

    if (!order) {
      throw new Error('Order does not exist.');
    }

    this.orders[orderId] = {
      ...data,
      id: orderId,
    };
  }
}
