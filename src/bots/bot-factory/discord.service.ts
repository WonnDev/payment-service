import { Injectable } from '@nestjs/common';
import { Payment } from 'src/gateways/gate.interface';
import { Bot } from '../bot.service';
import { Format3Dot } from 'src/shards/helpers/format3Dot';
import * as moment from 'moment-timezone';
import axios from 'axios';

@Injectable()
export class DiscordBot extends Bot {
  async sendMessage(payment: Payment) {
    let message = `🔊 +${Format3Dot(payment.amount)} ${payment.content}`;
    message += `\r\n💰 Số tiền: *${Format3Dot(payment.amount)}*`;
    message += `\r\n📇 Nội dung: **${payment.content}**`;
    message += `\r\n💳 Tài khoản: ${payment.account_receiver} (${payment.gate})`;
    message += `\r\n📅 Thời gian: ${moment
      .tz(payment.date, 'Asia/Ho_Chi_Minh')
      .format('HH:mm DD/MM/YYYY')}`;
    message += `\r\n🗃 Transaction id: ${payment.transaction_id}`;
    message += `\r\n---`;
    await axios.post(
      `https://discord.com/api/webhooks/${this.botConfig.chat_chanel_id}/${this.botConfig.token}`,
      {
        content: message,
      },
    );
  }
}
