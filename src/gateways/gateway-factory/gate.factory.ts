import { MBBankService } from './mbbank.services';
import { ACBBankService } from './acbbank.services';
import { GateConfig, GateType } from '../gate.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Gate } from '../gates.services';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';

export class GateFactory {
  create(
    config: GateConfig,
    eventEmitter: EventEmitter2,
    captchaSolver: CaptchaSolverService,
  ): Gate {
    switch (config.type) {
      case GateType.MBBANK:
        const mbbank = new MBBankService(config, eventEmitter, captchaSolver);
        return mbbank;
      case GateType.ACBBANK:
        const acbbank = new ACBBankService(config, eventEmitter, captchaSolver);
        return acbbank;
      default:
        throw new Error('Gate not found');
    }
  }
}
