import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as plots from './plots';
import { stat, mkdir } from 'fs/promises';
dotenv.config();

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

async function main() {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
        width: 800,
        height: 600,
        backgroundColour: '#ffffff',
    });

    for await (const plot of Object.values(plots)) {
        const plotClass = new plot.default();

        console.log(`Plotting ${plotClass.name}`);

        try {
            await stat(`./images/${plotClass.name}`);
        } catch (e) {
            if (e.code === 'ENOENT') {
                mkdir(`./images/${plotClass.name}`);
            }
            else {
                throw e;
            }
        }

        await plotClass.plot(prisma, chartJSNodeCanvas);
    }

    
}

main();