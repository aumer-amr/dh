import { PrismaClient, Roll, User } from '@prisma/client';
import { ChartType } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Plot } from './plot';

class LineRollsUser extends Plot {

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
    
            const labels = rolls.map((roll: Roll) => roll.createdAt.toISOString().split('T')[0]);
            const data = rolls.map((roll: Roll) => roll.roll);
    
            const ChartT = 'line' as ChartType;
    
            const configuration = {
                type: ChartT,
                data: {
                    labels,
                    datasets: [{
                        label: 'Rolls',
                        data,
                        fill: false,
                        borderColor: 'rgb(6, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Rolls for ${user.name}`
                        }
                    }
                }
            };
    
            const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
            await this.writeBuffer(buffer, user.name);
        }
    }

}

export default LineRollsUser;