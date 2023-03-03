import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import * as dotenv from 'dotenv';
import { createReadStream } from 'node:fs';
dotenv.config();

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

const data = [];

async function main(): Promise<void> {
    createReadStream('data/data.csv')
        .pipe(csv())
        .on('data', async (row) => {
            const { name, date, roll, dice } = row;
            data.push({ name, date, roll, dice });            
        })
        .on('end', async () => {
            for await (const { name, date, roll, dice } of data) {
                console.log(`Processing roll for ${name} with roll ${roll} and dice ${dice} on ${date}`)
            
                let user = await prisma.user.findUnique({
                    where: { name }
                });

                if (!user) {
                    try {
                        user = await prisma.user.create({
                            data: { name }
                        });
                    } catch (e) {
                        console.log(`Error creating user ${name}: ${e}`);
                        throw e;
                    }
                }

                if (dice === '12') {
                    await prisma.roll.create({
                        data: {
                            createdAt: parseDate(date),
                            roll: parseInt(roll),
                            user: { connect: { id: user.id } }
                        },
                    });
                    
                    console.log(`Created roll for ${name} with roll ${roll} and dice ${dice} on ${date}`);
                }
            }

            console.log('CSV file successfully processed');
        });
}

function parseDate(date: string): Date {
    const [month, day, year] = date.split('/').map(d => parseInt(d));
    return new Date(year, month - 1, day, 1, 0, 0);
}

main();
