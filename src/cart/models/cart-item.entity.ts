import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CartEntity } from './cart.entity';

@Entity('cart_items')
export class CartItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cart_id', type: 'int' })
  cartId: number;

  @Column({ name: 'product_id', type: 'varchar', nullable: false })
  productId: string;

  @Column({ type: 'int', nullable: false })
  count: number;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: CartEntity;
}
