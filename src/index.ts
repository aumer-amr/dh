import { PrismaClient } from '@prisma/client';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { program } from 'commander';
import * as dotenv from 'dotenv';
import { mkdir, stat } from 'node:fs/promises';
import * as plots from './plots';
import packageJson from '../package.json';

dotenv.config();

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

async function main(): Promise<void> {
    program.name(packageJson.name)
        .description(packageJson.description)
        .version(packageJson.version);

    program.option('-p, --plot <plot>', 'Plot to run');
    program.option('-a, --all', 'Run all plots');

    program.parse(process.argv);
    
    const options = program.opts();
    if (options.all) return await runAllPlots();

    program.help();
}

async function runAllPlots(): Promise<void> {
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