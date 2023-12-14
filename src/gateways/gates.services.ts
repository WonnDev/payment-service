import { EventEmitter2 } from '@nestjs/event-emitter';
import { GateConfig, Payment } from './gate.interface';
import { Injectable, Logger } from '@nestjs/common';
import { PAYMENT_HISTORY_UPDATED } from 'src/shards/events';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';
import { sleep } from 'src/shards/helpers/sleep';

@Injectable()
export abstract class Gate {
  private isCronRunning = true;
  private logger = new Logger(Gate.name);
  constructor(
    protected readonly config: GateConfig,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly captchaSolver: CaptchaSolverService,
  ) {
    this.cron();
  }

  abstract getHistory(): Promise<Payment[]>;
  getName() {
    return this.config.name;
  }
  async getHistoryAndPublish() {
    const payments = await this.getHistory();
    this.eventEmitter.emit(PAYMENT_HISTORY_UPDATED, payments);
    this.logger.log({
      label: 'CronInfo',
      type: this.config.type,
      payments: payments.length,
    });
  }
  async cron() {
    while (true) {
      if (!this.isCronRunning) {
        await sleep(5000);
        continue;
      }

      try {
        await this.getHistoryAndPublish();
        await sleep(this.config.repeat_interval_in_sec * 1000);
      } catch (error) {
        this.logger.error(error);
        await sleep(10000);
      }
    }
  }
  stopCron() {
    this.isCronRunning = false;
  }
  startCron() {
    this.isCronRunning = true;
  }
}
