import chalk from 'chalk';
import { createLogger, format, transports } from 'winston';

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
                return `${timestamp} [${chalk.cyan(metadata.service)}] [${level}]: ${message}`;
            })
        ),
        transports: [
            new transports.Console()
        ]
    });
}