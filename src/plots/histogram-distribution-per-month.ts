import { PrismaClient } from '@prisma/client';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Plot } from './plot';
import _ from 'lodash';
import { ChartType } from 'chart.js';

class HistogramDistributionPerMonth extends Plot {

    public async plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas) {
        const countByRolls = await prisma.roll.groupBy({
            _count: {
                roll: true
            },
            by: ['roll', 'createdAt']
        });

        const countByMonthAndDice = countByRolls.flatMap(r => [{ count: r._count.roll, dice: r.roll, month: r.createdAt.toLocaleString('default', { month: 'long' }) }]);
        const countPerMonth = countByMonthAndDice.reduce((accumulator, currentValue) => {
            if (!accumulator.find(p => p.dice == currentValue.dice)) {
                accumulator = [
                    ...accumulator,
                    { dice: currentValue.dice, count: [] }
                ]
            }

            const diceIndex = accumulator.findIndex(p => p.dice == currentValue.dice);
            if (!accumulator[diceIndex].count.find(p => p.month == currentValue.month )) {
                accumulator[diceIndex].count.push({ month: currentValue.month, count: 0 });
            }

            const countIndex = accumulator[diceIndex].count.findIndex(p => p.month == currentValue.month);
            accumulator[diceIndex].count[countIndex].count += currentValue.count;

            return accumulator;
        }, []);

        const labels = _.uniq(countByMonthAndDice.map(r => r.month));
        
        const ChartBar = 'bar' as ChartType;

        const datasets = [];

        const barColors = [
            '#8E44AD',
            '#27AE60',
            '#2980B9',
            '#F39C12',
            '#E74C3C',
            '#2C3E50',
            '#9B59B6',
            '#2ECC71',
            '#3498DB',
            '#BF55EC',
            '#16A085',
            '#34495E'
        ]

        countPerMonth.sort((a, b) => a.dice - b.dice).forEach(dice => {
            datasets.push({
                type: ChartBar,
                label: dice.dice,
                data: dice.count.map(c => c.count),
                fill: true,
                backgroundColor: barColors[dice.dice - 1],
                borderColor: barColors[dice.dice - 1],
                borderWidth: 1
            });
        });

        const configuration = {
            plugins: [ChartDataLabels],
            type: ChartBar,
            data: {
                labels,
                datasets
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Distribution of rolls per month`
                    },
                    datalabels: {
                        color: '#000000',
                        anchor: "end" as "start" | "end" | "center",
                        align: "end" as "start" | "end" | "center"
                    }
                }
            }
        };

        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        await this.writeBuffer(buffer, `distribution-per-month`);
    }

}

export default HistogramDistributionPerMonth;