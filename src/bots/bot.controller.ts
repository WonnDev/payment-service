import { Controller } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Payment } from 'src/gateways/gate.interface';
import { PAYMENT_CREATED } from 'src/shards/events';
import { BotManagerService } from './bots-manager.service';

@Controller()
export class BotController {
  constructor(private readonly botSetupService: BotManagerService) {}

  @OnEvent(PAYMENT_CREATED)
  handlePaymentCreatedEvent(payments: Payment[]) {
    this.botSetupService.onPaymentsCreated(payments);
  }
}
