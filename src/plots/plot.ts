import { PrismaClient } from "@prisma/client";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { writeFile } from "fs/promises";

export abstract class Plot implements PlottingInterface {
    async plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async writeBuffer(buffer: Buffer, fileName: String): Promise<void> {
        const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await writeFile(`./images/${this.name}/${cleanFileName}.png`, buffer);
    }

    public name: String = this.constructor.name;
}

export interface PlottingInterface {
    plot(prisma: PrismaClient, chartJSNodeCanvas: ChartJSNodeCanvas): Promise<void>;
}