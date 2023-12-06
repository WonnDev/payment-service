import { Injectable } from '@nestjs/common';
import { Payment } from '../gateways/gate.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYMENT_CREATED } from 'src/shards/events';

@Injectable()
export class PaymentService {
  private payments: Payment[] = [];

  constructor(private eventEmitter: EventEmitter2) {}

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
  }

  getPayments(): Payment[] {
    return this.payments;
  }
}
