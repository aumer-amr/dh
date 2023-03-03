import { PrismaClient } from '@prisma/client';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { writeFile } from 'node:fs/promises';

export abstract class Plot implements PlottingInterface {
    async plot(_prisma: PrismaClient, _chartJSNodeCanvas: ChartJSNodeCanvas): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async writeBuffer(buffer: Buffer, fileName: string): Promise<void> {
        const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await writeFile(`./images/${this.name}/${cleanFileName}.png`, buffer);
    }

    public name: string = this.constructor.name;
}

export interface PlottingInterface {
    plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas): Promise<void>;
}