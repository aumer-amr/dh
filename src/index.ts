import { program } from 'commander';
import * as dotenv from 'dotenv';
import { PlotManager } from './managers/plotManager';
import packageJson from '../package.json';

dotenv.config();

async function main(): Promise<void> {
    program.name(packageJson.name)
        .description(packageJson.description)
        .version(packageJson.version);

    program.option('-p, --plot <plot>', 'Plot to run');
    program.option('-a, --all', 'Run all plots');
    program.option('-l, --list', 'List all available plots');

    program.parse(process.argv);

    const plotManager = PlotManager.runManager();
    
    const options = program.opts();
    if (options.all) return await plotManager.runAllPlots();
    if (options.plot) return await plotManager.runPlot(options.plot);
    if (options.list) return await plotManager.listPlots();

    program.help();
}

main();