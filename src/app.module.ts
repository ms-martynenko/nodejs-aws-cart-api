import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { CartEntity, CartItemEntity } from './cart/models';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME', 'postgres'),
        entities: [CartEntity, CartItemEntity],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
        ssl: {
          rejectUnauthorized: false,
        },
        logging: configService.get<boolean>('DB_LOGGING', false),
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: false,
        extra: {
          connectionTimeoutMillis: 60000,
          query_timeout: 60000,
          statement_timeout: 60000,
          idle_in_transaction_session_timeout: 60000,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CartModule,
    OrderModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
