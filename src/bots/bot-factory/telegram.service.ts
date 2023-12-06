import { Injectable } from '@nestjs/common';
import { Payment } from 'src/gateways/gate.interface';
import { Bot } from '../bot.service';
import * as TelegramBotSDK from 'node-telegram-bot-api';
import { BotConfig } from '../bot.interfaces';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment-timezone';
import { Format3Dot } from 'src/shards/helpers/format3Dot';
@Injectable()
export class TelegramBot extends Bot {
  private readonly bot: TelegramBotSDK;
  constructor(
    protected botConfig: BotConfig,
    protected readonly configService: ConfigService,
  ) {
    super(botConfig, configService);

    this.bot = new TelegramBotSDK(botConfig.token, { polling: true });
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      if (msg.text == '/chatid')
        this.bot.sendMessage(chatId, `Your chat id: ${chatId}`);
    });
  }
  async sendMessage(payment: Payment) {
    let message = `🔊 +${Format3Dot(payment.amount)} ${payment.content}`;
    message += `\r\n💰 Số tiền: ${Format3Dot(payment.amount)}`;
    message += `\r\n📇 Nội dung: ${payment.content}`;
    message += `\r\n💳 Tài khoản: ${payment.account_receiver} (${payment.gate})`;
    message += `\r\n📅 Thời gian: ${moment
      .tz(payment.date, 'Asia/Ho_Chi_Minh')
      .format('HH:mm DD/MM/YYYY')}`;
    message += `\r\n🗃 Transaction id: ${payment.transaction_id}`;
    message += `\r\n---`;

    await this.bot.sendMessage(this.botConfig.chat_chanel_id, message);
  }
}
