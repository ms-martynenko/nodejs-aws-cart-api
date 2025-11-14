import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { BasicAuthGuard } from '../auth';
import { Order, OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';
import { calculateCartTotal } from './models-rules';
import { CartService } from './services';
import { CartItem, CartItemEntity } from './models';
import { CreateOrderDto, PutCartPayload } from 'src/order/type';

@Controller('api/profile/cart')
export class CartController {
  constructor(
    @Inject(CartService)
    private readonly cartService: CartService,
    @Inject(OrderService)
    private readonly orderService: OrderService,
  ) {}

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserCart(@Req() req: AppRequest): Promise<CartItemEntity[]> {
    const cart = await this.cartService.findOrCreateByUserId(
      getUserIdFromRequest(req),
    );

    return cart.items || [];
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart(
    @Req() req: AppRequest,
    @Body() body: PutCartPayload,
  ): Promise<CartItemEntity[]> {
    // TODO: validate body payload...
    const cart = await this.cartService.updateByUserId(
      getUserIdFromRequest(req),
      body,
    );

    return cart.items || [];
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearUserCart(@Req() req: AppRequest): Promise<void> {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get('total')
  async getCartTotal(@Req() req: AppRequest) {
    const userId = getUserIdFromRequest(req);
    return await this.cartService.getCartTotal(userId);
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put('order')
  async checkout(@Req() req: AppRequest, @Body() body: CreateOrderDto) {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findByUserId(userId);

    if (!(cart && cart.items && cart.items.length)) {
      throw new BadRequestException('Cart is empty');
    }

    const { id: cartId, items } = cart;
    // For now, we'll use a simple calculation since we don't have product prices
    const total = items.reduce((sum, item) => sum + item.count, 0); // This should be updated with real pricing

    const order = await this.orderService.create({
      userId,
      cartId: cartId.toString(),
      items: items.map((item) => ({
        productId: item.productId,
        count: item.count,
      })),
      address: body.address,
      total,
    });

    // Clear the cart after checkout
    await this.cartService.clearCart(userId);

    return {
      order,
    };
  }

  @UseGuards(BasicAuthGuard)
  @Get('order')
  async getOrder(): Promise<Order[]> {
    return await this.orderService.getAll();
  }
}
