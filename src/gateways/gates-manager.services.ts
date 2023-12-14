import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PaymentConfigService } from 'src/payment-config/payment-config.services';
import { GateFactory } from './gateway-factory/gate.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Gate } from 'src/gateways/gates.services';
import { GateConfig, GateType } from './gate.interface';
import * as Joi from 'joi';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';

@Injectable()
export class GatesManagerService implements OnApplicationBootstrap {
  private gates: Gate[] = [];

  constructor(
    private readonly paymentConfigService: PaymentConfigService,
    private readonly gateFactory: GateFactory,
    private eventEmitter: EventEmitter2,
    private readonly captchaSolverService: CaptchaSolverService,
  ) {}

  async onApplicationBootstrap() {
    const banksConfig =
      await this.paymentConfigService.getConfigPath<GateConfig>('gateways');
    await this.validateBanksConfig(banksConfig);

    this.createGates(banksConfig);
  }

  createGates(banksConfig: GateConfig[]) {
    this.gates = banksConfig.map((bankConfig) =>
      this.gateFactory.create(
        bankConfig,
        this.eventEmitter,
        this.captchaSolverService,
      ),
    );
  }

  async validateBanksConfig(banksConfig: GateConfig[]) {
    const gateConfigSchema = Joi.object({
      name: Joi.string().required(),
      type: Joi.valid(...Object.values(GateType)).required(),
      repeat_interval_in_sec: Joi.number().min(10).max(120).required(),
      password: Joi.string().required(),
      // login_id required if type is ACBBank
      login_id: Joi.string().when('type', {
        is: [GateType.ACBBANK, GateType.MBBANK],
        then: Joi.required(),
      }),
      token: Joi.string(),
      account: Joi.string().required(),
    });

    for (const bankConfig of banksConfig) {
      const { error } = gateConfigSchema.validate(bankConfig);
      if (error) {
        throw error;
      }
    }
  }

  stopCron(name: string, timeInSec: number) {
    const gate = this.gates.find((gate) => gate.getName() === name);
    if (!gate) throw new NotFoundException({ error: 'Gate not found' });

    gate.stopCron();
    setTimeout(() => {
      gate.startCron();
    }, timeInSec * 1000);
  }
  stopAllCron() {
    this.gates.forEach((gate) => gate.stopCron());
    setTimeout(() => {
      this.startAllCron();
    }, 5 * 60000);
  }
  startAllCron() {
    this.gates.forEach((gate) => gate.startCron());
  }
}
