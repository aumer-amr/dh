import { program } from 'commander';
import * as dotenv from 'dotenv';
import { PlotConfig } from './interfaces/config';
import { DriveManager } from './managers/driveManager';
import { ImportManager } from './managers/importManager';
import { PlotManager } from './managers/plotManager';
import packageJson from '../package.json';

dotenv.config();

async function main(): Promise<void> {
    program.name(packageJson.name)
        .description(packageJson.description)
        .version(packageJson.version);

    program.option('-r, --run', 'Run the auto updater from google drive');
    program.option('-p, --plot <plot>', 'Plot to run');
    program.option('-a, --all', 'Run all plots');
    program.option('-l, --list', 'List all available plots');
    program.option('-i, --import <file>', 'Import data from a file');
    program.option('-c, --config <config>', 'Comma separated list of plot config properties');

    program.parse(process.argv);

    const plotManager = PlotManager.getManager();
    const driveManager = DriveManager.getManager();
    const importManager = ImportManager.getManager();
    
    const options = program.opts();
    let plotConfig = {};
    if (options.config) plotConfig = parseConfig(options.config);

    if (options.all) return await plotManager.runAllPlots(plotConfig);
    if (options.plot) return await plotManager.runPlot(options.plot, plotConfig);
    if (options.list) return await plotManager.listPlots();
    if (options.run) return await driveManager.run();
    if (options.import) return await importManager.import(options.import);

    program.help();
}

function parseConfig(config: string): PlotConfig {
    const configObject = {};
    for (const configItem of config.split(',')) {
        const [key, value] = configItem.split('=');
        configObject[key] = value;
    }
    return configObject;
}

main();