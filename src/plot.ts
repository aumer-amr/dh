import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as plots from './plots/plots';
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

    for await (const plot of Object.entries(plots)) {
        const [name, plotFn] = plot;
        console.log(`Plotting ${name}`);

        try {
            await stat(`./images/${name}`);
        } catch (e) {
            if (e.code === 'ENOENT') {
                mkdir(`./images/${name}`);
            }
            else {
                throw e;
            }
        }

        await plotFn.default(prisma, chartJSNodeCanvas);
    }

    
}

main();