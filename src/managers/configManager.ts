import { PlotConfig, PlotConfigOption } from '../interfaces/config';
import { Manager } from '../interfaces/managers';
import { Plot } from '../interfaces/plot';
import { factory } from '../logger';

const logger = factory('ConfigManager');

export class ConfigManager implements Manager {

    protected static _instance: ConfigManager;
    private config: PlotConfig = {};
    private plot: Plot;

    static getManager(): ConfigManager {
        if (this._instance) return this._instance;

        this._instance = new ConfigManager();

        return this._instance;
    }

    public configOptions(plot?: Plot): PlotConfigOption[] {
        return (plot ? plot.options() : this.plot.options());
    }

    public setConfig(plot: Plot, plotConfig: PlotConfig): void {
        this.validateConfig(plot, plotConfig);
        this.config = plotConfig;
        plot.configManager = this;
        this.plot = plot;
    }

    public getConfig(name: string): any {
        const configValue = this.config[name] ?? this.plot.options().find((option) => option.name === name)?.default ?? null;
        if (configValue === null) {
            if (this.plot.options().find((option) => option.name === name)?.required) {
                throw logger.error(`Required option has no default value: ${name}`);
            }
        }
        return configValue;
    }

    public validateConfig(plot: Plot, plotConfig: PlotConfig): void {
        const configPlots = Object.keys(plotConfig);
        const plotOptions = plot.options();

        configPlots.forEach((optionGiven) => {
            const option = plotOptions.find((option) => option.name === optionGiven);
            if (!option) {
                throw logger.error(`Unknown config option: ${optionGiven}`);
            }
        });

        plotOptions.forEach((option) => {
            if (option.required && !option.default && !configPlots.includes(option.name)) {
                throw logger.error(`Missing required config option: ${option.name}`);
            }
        });

        configPlots.forEach((optionGiven) => {
            const option = plotOptions.find((option) => option.name === optionGiven);
            const configValue = plotConfig[optionGiven];

            switch(option.type) {
                case 'number':
                    if (typeof parseFloat(configValue) !== 'number' && !isNaN(parseFloat(configValue))) {
                        throw logger.error(`Invalid config option type: ${optionGiven} must be of type ${option.type}, but is of type ${typeof configValue}`);
                    }
                    break;
                case 'boolean':
                    if (configValue !== 'true' && configValue !== 'false') {
                        throw logger.error(`Invalid config option type: ${optionGiven} must be of type ${option.type}, but is of type ${typeof configValue}`);
                    }
                    break;
                default:
                    throw logger.error(`Invalid config option type: ${optionGiven} must be of type ${option.type}, but is of type ${typeof configValue}`);
            }
        });
    }

}