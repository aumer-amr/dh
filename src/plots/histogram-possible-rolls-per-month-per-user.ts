import { PrismaClient, Roll, User } from '@prisma/client';
import { ChartType } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import _ from 'lodash';
import { Plot } from '../interfaces/plot';

class HistogramPossibleRollsPerMonthPerUser extends Plot {

    public async plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas): Promise<void> {
        const users: User[] = await prisma.user.findMany();
    
        for await (const user of users) {
            const rolls: Roll[] = await prisma.roll.findMany({
                where: {
                    userId: user.id
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
    
            if (rolls.length === 0 || rolls.length === 1) {
                continue;
            }
            
            const countByMonthAndYear = rolls.map(r => 
                {
                    return {
                        roll: r.roll, 
                        month: r.createdAt.toLocaleString('default', { month: 'long', timeZone: 'UTC' }),
                        year: r.createdAt.toLocaleString('default', { year: '2-digit', timeZone: 'UTC' }) 
                    }
                }
            );

            const countPerMonth = countByMonthAndYear.reduce((accumulator, currentValue) => {
                if (!accumulator.find(p => p.year == currentValue.year && p.month == currentValue.month)) {
                    accumulator = [
                        ...accumulator,
                        { year: currentValue.year, month: currentValue.month, rolls: 0, count: 0 }
                    ]
                }

                const monthIndex = accumulator.findIndex(p => p.year == currentValue.year && p.month == currentValue.month);
                accumulator[monthIndex].rolls += 1;
                accumulator[monthIndex].count += currentValue.roll;
    
                return accumulator;
            }, []);

            const labels = _.uniq(countByMonthAndYear.map(r => `${r.month} '${r.year}`));

            const ChartBar = 'bar' as ChartType;
            const configuration = {
                plugins: [ChartDataLabels],
                type: ChartBar,
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Sum of rolls',
                            data: countPerMonth.map(r => r.count),
                            backgroundColor: '#27AE60',
                            borderColor: '#27AE60',
                            borderWidth: 1
                        },
                        {
                            label: 'Maximum possible sum of rolls',
                            data: countPerMonth.map(r => r.rolls * 12),
                            backgroundColor: '#8E44AD',
                            borderColor: '#8E44AD',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Highest possilbe rolls per month for ${user.name}`
                        },
                        datalabels: {
                            color: '#000000',
                            anchor: 'end' as 'start' | 'end' | 'center',
                            align: 'end' as 'start' | 'end' | 'center',
                        }
                    },
                    scales: {
                        y: {
                            stacked: false,
                            beginAtZero: true
                        },
                        x: {
                            stacked: true
                        }
                    }
                }
            };
    
            const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
            await this.writeBuffer(buffer, user.name);
        }
    }

}

export default HistogramPossibleRollsPerMonthPerUser;