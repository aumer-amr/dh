import { Chart } from 'chart.js';

const namePlugin = {
    id: 'namePlugin',
    afterDraw: (chart: Chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.translate(chart.width - 10, chart.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(`Graphs by Aumer - Stats by ${process.env.STATS_BY ?? 'Not set update config'}`, 0, 0);
        ctx.restore();
    }
}

export default namePlugin;