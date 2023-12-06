import { EventEmitter2 } from '@nestjs/event-emitter';
import { GateConfig, Payment } from './gate.interface';
import { Injectable, Logger } from '@nestjs/common';
import { PAYMENT_HISTORY_UPDATED } from 'src/shards/events';

@Injectable()
export abstract class Gate {
  private isCronRunning = true;
  private logger = new Logger(Gate.name);
  constructor(
    protected readonly config: GateConfig,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.cron();
    this.getHistoryAndPublish();
  }

  abstract getHistory(): Promise<Payment[]>;
  getName() {
    return this.config.name;
  }
  getHistoryAndPublish() {
    this.getHistory()
      .then((payments) => {
        this.eventEmitter.emit(PAYMENT_HISTORY_UPDATED, payments);
        this.logger.log({
          label: 'CronInfo',
          type: this.config.type,
          payments: payments.length,
        });
      })
      .catch((error) => {
        this.logger.error(error);
      })
      .finally(() => {});
  }
  cron() {
    setInterval(() => {
      if (!this.isCronRunning) return;

      this.getHistoryAndPublish();
    }, this.config.repeat_interval_in_sec * 1000);
  }
  stopCron() {
    this.isCronRunning = false;
  }
  startCron() {
    this.isCronRunning = true;
  }
}
