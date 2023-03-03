import { ChartType } from 'chart.js';
import { PrismaClient } from '@prisma/client';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Plot } from './plot';
import _ from 'lodash';

type DataGroup = {
    low: number;
    high: number;
    mean: number;
    rolls: number;
    users: number;
}

class HistogramAvgRollsGroups extends Plot {

    public async plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas) {
        const groups = await this.generateGroups(prisma);

        const labels = groups.map(dataGroup => `${dataGroup.low} - ${dataGroup.high}`);
        const dataMean = groups.map(dataGroup => dataGroup.mean);
        const dataRolls = groups.map(dataGroup => dataGroup.rolls);
        const dataUsers = groups.map(dataGroup => dataGroup.users);

        const ChartBar = 'bar' as ChartType;
        const ChartLine = 'line' as ChartType;
        const ChartScatter = 'scatter' as ChartType;

        const configuration = {
            plugins: [ChartDataLabels],
            type: ChartScatter,
            data: {
                labels,
                datasets: [{
                    type: ChartLine,
                    label: 'Mean average',
                    data: dataMean,
                    fill: false,
                    borderColor: 'rgb(255, 6, 6)',
                    borderWidth: 1
                }, {
                    type: ChartLine,
                    label: 'Users',
                    data: dataUsers,
                    fill: false,
                    borderColor: 'rgb(6, 6, 255)',
                    borderWidth: 1
                }, {
                    type: ChartBar,
                    label: 'Rolls',
                    data: dataRolls,
                    fill: false,
                    borderColor: 'rgb(6, 192, 192)',
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Mean averages per amount of rolls`
                    },
                    datalabels: {
                        color: '#000000',
                        anchor: "end" as "start" | "end" | "center",
                        align: "end" as "start" | "end" | "center",
                        display: 'auto'
                    }
                }
            }
        };

        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        await this.writeBuffer(buffer, `mean-avg`);
    }

    private async generateGroups(prisma: PrismaClient): Promise<DataGroup[]> {
        const groupSize = 10;

        const maxRollRecords = await prisma.roll.groupBy({
            by: ['userId'],
            _count: {
                _all: true
            }
        });

        const maxRolls = Math.max(...maxRollRecords.map(r => r._count._all));

        const numbers = [...Array.from({ length: Math.ceil(maxRolls / groupSize) * groupSize }, (_, i) => ++i)];
        const numberGroups = _.chunk(numbers, groupSize);

        const dataGroups = numberGroups.flatMap(ng => [{ low: _.head(ng), high: _.last(ng), mean: 0, users: 0 } as DataGroup]);
        for await (const group of dataGroups) {
            const { low, high } = group;

            const usersForGroup = maxRollRecords.filter(r => r._count._all >= low && r._count._all <= high).map(u => u.userId);
            const rollsForGroup = await prisma.roll.findMany({
                select: {
                    roll: true
                },
                where: {
                    userId: { in: usersForGroup }
                }
            });

            group.mean = _.round(_.mean(rollsForGroup.map(r => r.roll)), 2);
            group.rolls = rollsForGroup.length;
            group.users = usersForGroup.length;
        }

        return dataGroups;
    }

}

export default HistogramAvgRollsGroups;