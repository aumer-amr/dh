import { PrismaClient } from '@prisma/client';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { mkdir, stat } from 'node:fs/promises';
import { ConfigManager } from './configManager';
import { PlotConfig } from '../interfaces/config';
import { Manager } from '../interfaces/managers';
import { Plot } from '../interfaces/plot';
import { AvailablePlots } from '../interfaces/plotManager';
import { factory } from '../logger';
import * as plots from '../plots';
import namePlugin from '../plugins/namePlugin';

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
    width: 840,
    height: 640,
    backgroundColour: '#ffffff',
    chartCallback: (ChartJS) => {
        ChartJS.defaults.layout.padding = 20;
        ChartJS.register(namePlugin);
    }
});

const logger = factory('PlotManager');

export class PlotManager implements Manager {

    private availablePlots: AvailablePlots = {};
    protected static _instance: PlotManager;

    static getManager(): PlotManager {
        if (this._instance) return this._instance;

        this._instance = new PlotManager();

        return this._instance;
    }

    private constructor() {
        this.initalizePlots();
    }

    public get plots(): AvailablePlots {
        return this.availablePlots;
    }

    public plot(name: string): Plot {
        return this.availablePlots[name];
    }

    public initalizePlots(): void {
        for (const plot of Object.values(plots)) {
            const plotClass = new plot.default();
            this.availablePlots[plotClass.name] = plotClass;
        }
    }

    public async listPlots(): Promise<void> {
        const configManager = ConfigManager.getManager();

        logger.info('Available plots:');
        for (const plot of Object.values(this.availablePlots)) {
            logger.info(`- ${plot.name}`);

            const configOptions = configManager.configOptions(plot);
            if (configOptions.length > 0) {
                logger.info(`\tConfig options:`);

                configOptions.forEach((option) => {
                    logger.info(`\t= ${option.name}`);
                    logger.info(`\t - Description: ${option.description}`);
                    logger.info(`\t - Type: ${option.type}`)
                    logger.info(`\t - Required: ${option.required ? 'Yes' : 'No'}`);
                    logger.info(`\t - Default: ${option.default ? option.default : 'None'}`);
                });
            }
        }
    }

    public async runAllPlots(plotConfig: PlotConfig): Promise<void> {
        for (const plot of Object.values(this.availablePlots)) {
            await this.runPlot(plot.name, plotConfig);
        }
    }

    public async runPlot(name: string, plotConfig: PlotConfig): Promise<void> {
        const plot = this.availablePlots[name];
        if (!plot) {
            logger.error(`Plot ${name} not found`);
            return;
        }

        logger.info(`Plotting ${plot.name}`);

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

        const configManager = ConfigManager.getManager();
        configManager.setConfig(plot, plotConfig);

        await plot.plot(prisma, chartJSNodeCanvas);
    } 

}