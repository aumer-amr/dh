import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import { createReadStream } from 'node:fs';
import { Manager } from '../interfaces/managers';
import { factory } from '../logger';

const logger = factory('ImportManager');

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

export class ImportManager implements Manager {

    protected static _instance: ImportManager;
    private data: any[] = [];

    static getManager(): ImportManager {
        if (this._instance) return this._instance;

        this._instance = new ImportManager();

        return this._instance;
    }

    public async clean(): Promise<void> {
        logger.info('Cleaning data');

        await prisma.roll.deleteMany({});
        await prisma.user.deleteMany({});
    }

    public async import(filePath: string): Promise<void> {
        logger.info('Importing data');

        // eslint-disable-next-line @typescript-eslint/return-await
        return new Promise((resolve, reject) => {
            createReadStream(filePath)
                .pipe(csv())
                .on('error', (err) => {
                    logger.error(`Error reading CSV file from disk: ${err}`);
                    reject(err);
                })
                .on('data', async (row) => {
                    const { Name, Date, Roll, Dice } = row;
                    this.data.push({ name: Name, date: Date, roll: Roll, dice: Dice });            
                })
                .on('end', async () => {
                    for await (const { name, date, roll, dice } of this.data) {
                        logger.debug(`Processing roll for ${name} with roll ${roll} and dice ${dice} on ${date}`)
                    
                        let user = await prisma.user.findUnique({
                            where: { name }
                        });

                        if (!user) {
                            try {
                                user = await prisma.user.create({
                                    data: { name }
                                });
                            } catch (e) {
                                logger.error(`Error creating user ${name}: ${e}`);
                                throw e;
                            }
                        }

                        if (dice === '12') {
                            const count = await prisma.roll.count({
                                where: {
                                    createdAt: this.parseDate(date),
                                    roll: parseInt(roll),
                                    userId: user.id
                                }
                            });

                            if (count === 0) {
                                await prisma.roll.create({
                                    data: {
                                        createdAt: this.parseDate(date),
                                        roll: parseInt(roll),
                                        user: { connect: { id: user.id } }
                                    },
                                });
                                
                                logger.debug(`Created roll for ${name} with roll ${roll} and dice ${dice} on ${date}`);
                            } else {
                                logger.debug(`Roll already exists for ${name} with roll ${roll} and dice ${dice} on ${date}`);
                            }
                        }
                    }
                    resolve();
                });
        });
    }

    private parseDate(date: string): Date {
        const [month, day, year] = date.split('/').map(d => parseInt(d));
        return new Date(year, month - 1, day, 1, 0, 0);
    }
}