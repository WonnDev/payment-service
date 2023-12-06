import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Payment } from '../gateways/gate.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYMENT_CREATED } from 'src/shards/events';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService implements OnApplicationBootstrap {
  private payments: Payment[] = [];
  private redis: Redis;
  constructor(
    private eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.redis = this.configService.get('redis');
  }

  async onApplicationBootstrap() {
    const payments = await this.redis.get('payments');
    if (payments) {
      this.payments = JSON.parse(payments);
    }
  }

  async saveRedis() {
    await this.redis.set('payments', JSON.stringify(this.payments));
  }

  isExists(payment: Payment) {
    return this.payments.some(
      (el) => el.transaction_id == payment.transaction_id,
    );
  }
  addPayments(payments: Payment[]) {
    const newPayments = payments.filter((payment) => !this.isExists(payment));

    if (newPayments.length == 0) return;

    this.eventEmitter.emit(PAYMENT_CREATED, newPayments);

    this.payments.push(...newPayments);

    this.payments = this.payments.slice(-500);
    this.saveRedis();
  }

  getPayments(): Payment[] {
    return this.payments;
  }
}
