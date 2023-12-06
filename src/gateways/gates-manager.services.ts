import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PaymentConfigService } from 'src/payment-config/payment-config.services';
import { GateFactory } from './gateway-factory/gate.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Gate } from 'src/gateways/gates.services';
import { GateConfig, GateType } from './gate.interface';
import * as Joi from 'joi';

@Injectable()
export class GatesManagerService implements OnApplicationBootstrap {
  private gates: Gate[] = [];

  constructor(
    private readonly paymentConfigService: PaymentConfigService,
    private readonly gateFactory: GateFactory,
    private eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    const banksConfig =
      await this.paymentConfigService.getConfigPath<GateConfig>('gateways');
    await this.validateBanksConfig(banksConfig);

    this.createGates(banksConfig);
  }

  createGates(banksConfig: GateConfig[]) {
    this.gates = banksConfig.map((bankConfig) =>
      this.gateFactory.create(bankConfig, this.eventEmitter),
    );
  }

  async validateBanksConfig(banksConfig: GateConfig[]) {
    const gateConfigSchema = Joi.object({
      name: Joi.string().required(),
      type: Joi.valid(...Object.values(GateType)).required(),
      repeat_interval_in_sec: Joi.number().min(10).max(120).required(),
      password: Joi.string().required(),
      token: Joi.string().required(),
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
    gate.stopCron();
    setTimeout(() => {
      gate.startCron();
    }, timeInSec * 1000);
  }
}
