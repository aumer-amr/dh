import chalk from 'chalk';
import { Webhook } from 'discord-webhook-node';
import * as dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
dotenv.config();

const hook = new Webhook(process.env.DISCORD_WEBHOOK_URL);

export function factory(name: string): any {
    return createLogger({
        level: process.env.LOG_LEVEL || 'info',
        defaultMeta: { service: name },
        format: format.combine(
            format.metadata(),
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.colorize(),
            format.printf(({ timestamp, level, message, metadata }) => {
                if (level.includes('error')) {
                    hook.error(metadata.service, 'error', message);
                }
                else if (level.includes('warn')) {
                    hook.warning(metadata.service, 'warning', message);
                }
                return `${timestamp} [${chalk.cyan(metadata.service)}] [${level}]: ${message}`;
            })
        ),
        transports: [
            new transports.Console()
        ]
    });
}