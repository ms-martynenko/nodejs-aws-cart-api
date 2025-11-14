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
import { CartService } from './services';
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
  async findUserCart(@Req() req: AppRequest) {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findOrCreateByUserId(userId);

    // Transform to match expected API format
    const items =
      cart.items?.map((item) => ({
        product: {
          id: item.productId,
          title: `Product ${item.productId}`,
          description: `Description for ${item.productId}`,
          price: 0, // Would come from product service
        },
        count: item.count,
      })) || [];

    return {
      cart: {
        id: cart.id.toString(),
        items,
      },
    };
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart(@Req() req: AppRequest, @Body() body: PutCartPayload) {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.updateByUserId(userId, body);

    // Transform to match expected API format
    const items =
      cart.items?.map((item) => ({
        product: {
          id: item.productId,
          title: body.product.title || `Product ${item.productId}`,
          description:
            body.product.description || `Description for ${item.productId}`,
          price: body.product.price || 0,
        },
        count: item.count,
      })) || [];

    return {
      cart: {
        id: cart.id.toString(),
        items,
      },
    };
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
    const total = items.reduce((sum, item) => sum + item.count, 0);

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
