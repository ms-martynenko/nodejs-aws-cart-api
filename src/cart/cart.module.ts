import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderModule } from '../order/order.module';

import { CartController } from './cart.controller';
import { CartService } from './services';
import { CartEntity, CartItemEntity } from './models';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    OrderModule,
  ],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService], // Export in case other modules need it
})
export class CartModule {}
