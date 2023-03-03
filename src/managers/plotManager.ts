import { PrismaClient } from '@prisma/client';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { mkdir, stat } from 'node:fs/promises';
import { AvailablePlots } from '../interfaces/plotManager';
import * as plots from '../plots';

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

export class PlotManager {

    private availablePlots: AvailablePlots = {};
    protected static _instance: PlotManager;

    static runManager(): PlotManager {
        if (this._instance) return this._instance;

        this._instance = new PlotManager();

        return this._instance;
    }

    private constructor() {
        this.initalizePlots();
    }

    public initalizePlots(): void {
        for (const plot of Object.values(plots)) {
            const plotClass = new plot.default();
            this.availablePlots[plotClass.name] = plotClass;
        }
    }

    public async listPlots(): Promise<void> {
        console.log('Available plots:');
        for (const plot of Object.values(this.availablePlots)) {
            console.log(`- ${plot.name}`);
        }
    }

    public async runAllPlots(): Promise<void> {
        for (const plot of Object.values(this.availablePlots)) {
            await this.runPlot(plot.name);
        }
    }

    public async runPlot(name: string): Promise<void> {
        const plot = this.availablePlots[name];
        if (!plot) {
            console.error(`Plot ${name} not found`);
            return;
        }

        console.log(`Plotting ${plot.name}`);

        try {
            await stat(`./images/${plot.name}`);
        } catch (e) {
            if (e.code === 'ENOENT') {
                mkdir(`./images/${plot.name}`);
            }
            else {
                throw e;
            }
        }

        const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
            width: 800,
            height: 600,
            backgroundColour: '#ffffff',
        });

        await plot.plot(prisma, chartJSNodeCanvas);
    } 

}