import { ChartType } from 'chart.js';
import { PrismaClient } from '@prisma/client';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Plot } from './plot';
import _ from 'lodash';

class RadarRollsAmount extends Plot {

    public async plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas) {
        const labels = Array.from({ length: 12 }, (_, i) => ++i);
        
        const countByRolls = await prisma.roll.groupBy({
            _count: {
                roll: true
            },
            by: ['roll']
        });

        const data = countByRolls.map(c => [c.roll, c._count.roll]).sort((a, b) => a[0] - b[0]).map(c => c[1]);
        
        const ChartRadar = 'radar' as ChartType;

        const configuration = {
            plugins: [ChartDataLabels],
            type: ChartRadar,
            data: {
                labels,
                datasets: [{
                    label: 'Rolls',
                    data,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    pointBackgroundColor: 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    datalabels: {
                        offset: 4,
                        color: '#ff0000',
                        align: "end" as "end",
                        anchor: "end" as "end"
                    }
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Distribution of rolls per dice number`
                    }
                }
            }
        };

        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        await this.writeBuffer(buffer, `distribution-rolls`);
    }

}

export default RadarRollsAmount;