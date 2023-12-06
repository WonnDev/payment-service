import { Controller, Get, Query } from '@nestjs/common';
import { GatesManagerService } from './gates-manager.services';
import * as moment from 'moment-timezone';
import { OnEvent } from '@nestjs/event-emitter';
import { GATEWAY_STOP_CRON } from 'src/shards/events';

@Controller('gateways')
export class GatesController {
  constructor(private readonly gateManagerService: GatesManagerService) {}

  @Get('stop-gate')
  stopGate(
    @Query('name') name: string,
    @Query('time_in_sec') timeInSec: number,
  ) {
    this.gateManagerService.stopCron(name, timeInSec);
    return {
      message: 'ok',
      next_run: moment()
        .add(timeInSec, 'seconds')
        .tz('Asia/Ho_Chi_Minh')
        .format('DD-MM-YYYY HH:mm:ss'),
    };
  }

  @OnEvent(GATEWAY_STOP_CRON)
  stopGateCron() {
    this.gateManagerService.stopAllCron();
  }
}
