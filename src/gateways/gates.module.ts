import { Module } from '@nestjs/common';
import { GateFactory } from './gateway-factory/gate.factory';
import { GatesManagerService } from './gates-manager.services';
import { GatesController } from './gates.controller';

@Module({
  controllers: [GatesController],
  providers: [GatesManagerService, GateFactory],
  exports: [GateFactory],
})
export class GatesModule {}
