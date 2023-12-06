import { ConfigService } from '@nestjs/config';
import { BotConfig, BotType } from '../bot.interfaces';
import { Bot } from '../bot.service';
import { TelegramBot } from './telegram.service';
import { DiscordBot } from './discord.service';

export class BotFactory {
  create(botConfig: BotConfig, configService: ConfigService): Bot {
    switch (botConfig.type) {
      case BotType.TELEGRAM:
        const telegram = new TelegramBot(botConfig, configService);
        return telegram;
      case BotType.DISCORD:
        const discord = new DiscordBot(botConfig, configService);
        return discord;
      default:
        throw new Error('Bot not found');
    }
  }
}
