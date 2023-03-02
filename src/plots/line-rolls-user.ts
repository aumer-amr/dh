import { ChartType } from 'chart.js';
import { writeFileSync } from 'fs';

async function plot(prisma, chartJSNodeCanvas) {
    const users = await prisma.user.findMany();

    for await (const user of users) {
        const rolls = await prisma.roll.findMany({
            where: {
                userId: user.id
            }
        });

        if (rolls.length === 0) {
            continue;
        }

        const labels = rolls.map(roll => roll.createdAt.toISOString().split('T')[0]);
        const data = rolls.map(roll => roll.roll);

        const ChartT = 'line' as ChartType;

        const configuration = {
            type: ChartT,
            data: {
                labels,
                datasets: [{
                    label: 'Rolls',
                    data,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
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

        const cleanFileName = user.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        writeFileSync(`./images/line_rolls_user/${cleanFileName}.png`, buffer);
    }
}

export default plot;