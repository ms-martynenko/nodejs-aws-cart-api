import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, CartItemEntity, CartStatus } from '../models';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CartEntity | null> {
    return await this.cartRepository.findOne({
      where: { userId, status: CartStatus.OPEN },
      relations: ['items'],
    });
  }

  async createByUserId(userId: string): Promise<CartEntity> {
    const cart = this.cartRepository.create({
      userId,
      status: CartStatus.OPEN,
      items: [],
    });

    return await this.cartRepository.save(cart);
  }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    let cart = await this.findByUserId(userId);

    if (!cart) {
      cart = await this.createByUserId(userId);
    }

    return cart;
  }

  async updateByUserId(
    userId: string,
    payload: PutCartPayload,
  ): Promise<CartEntity> {
    const cart = await this.findOrCreateByUserId(userId);

    // Find existing cart item with the same product
    const existingItem = cart.items?.find(
      (item) => item.productId === payload.product.id,
    );

    if (existingItem) {
      if (payload.count === 0) {
        // Remove item if count is 0
        await this.cartItemRepository.remove(existingItem);
      } else {
        // Update existing item
        existingItem.count = payload.count;
        await this.cartItemRepository.save(existingItem);
      }
    } else if (payload.count > 0) {
      // Add new item
      const newItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: payload.product.id,
        count: payload.count,
      });
      await this.cartItemRepository.save(newItem);
    }

    // Return updated cart with items
    return await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });
  }

  async removeByUserId(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);
    if (cart) {
      await this.cartRepository.remove(cart);
    }
  }

  async getCartTotal(userId: string): Promise<{ total: number; items: any[] }> {
    const cart = await this.findByUserId(userId);

    if (!cart || !cart.items.length) {
      return { total: 0, items: [] };
    }

    // For now, we don't have product prices in the database
    // This would need to be integrated with a product service
    const items = cart.items.map((item) => ({
      productId: item.productId,
      count: item.count,
    }));

    return {
      total: 0, // Would need product service integration
      items,
    };
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);
    if (cart) {
      // Remove all items
      await this.cartItemRepository.remove(cart.items);
      // Update cart status
      cart.status = CartStatus.ORDERED;
      await this.cartRepository.save(cart);
    }
  }
}
