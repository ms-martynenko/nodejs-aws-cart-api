import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CartItemEntity } from './cart-item.entity';

export enum CartStatus {
  OPEN = 'OPEN',
  ORDERED = 'ORDERED',
}

@Entity('carts')
export class CartEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'varchar', nullable: false })
  userId: string;

  @Column({
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.OPEN,
  })
  status: CartStatus;

  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItemEntity[];

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
