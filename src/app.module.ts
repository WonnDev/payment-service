import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentConfigModule } from './payment-config/payment-config.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhookModule } from './webhook/webhook.module';
import configuration from './configuration';
import { BotModule } from './bots/bots.module';
import { queueUIMiddleware } from './shards/middlewares/queues.middleware';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
      }),
    }),
    PaymentConfigModule,
    PaymentsModule,
    WebhookModule,
    BotModule,
  ],
  providers: [],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        queueUIMiddleware({
          host: this.configService.get<string>('REDIS_HOST'),
          port: this.configService.get<number>('REDIS_PORT'),
        }),
      )
      .forRoutes('/admin/queues');
  }
}
