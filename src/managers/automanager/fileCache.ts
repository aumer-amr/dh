import { PrismaClient } from '@prisma/client';
import { drive_v3 } from 'googleapis';
import { factory } from '../../logger';

const logger = factory('FileCache');

const prisma = new PrismaClient({
    errorFormat: 'pretty',
});

export class FileCache {

    private cache: drive_v3.Schema$File[] = [];

    public constructor() {
        this.syncCache();
    }

    public getCache(): drive_v3.Schema$File[] {
        return this.cache;
    }

    public upsertFile(file: drive_v3.Schema$File): void {
        this.cache[file.id] = file;
        prisma.files.upsert({
            where: {
                id: file.id,
            },
            update: {
                name: file.name,
                modifiedTime: file.modifiedTime
            },
            create: {
                id: file.id,
                name: file.name,
                modifiedTime: file.modifiedTime || file.createdTime || new Date().toISOString()
            },
        }).catch((err) => {
            logger.error(err);
        })
    }

    public getFile(id: string): drive_v3.Schema$File {
        return this.cache[id];
    }

    public removeFile(id: string): void {
        delete this.cache[id];
        prisma.files.delete({
            where: {
                id: id
            },
        }).catch((err) => {
            logger.error(err);
        });
    }

    public hasFile(id: string): boolean {
        return !!this.cache[id];
    }

    public hasFiles(): boolean {
        return !!this.cache.length;
    }

    public getFiles(): drive_v3.Schema$File[] {
        return this.cache;
    }

    public syncCache(): void {
        logger.info('Syncing cache');
        prisma.files.findMany().then((files) => {
            logger.info(`Found ${files.length} files in cache`);

            for (const file of files) {
                this.cache[file.id] = file;
            }
        });
    }

    public isFileNewer(file: drive_v3.Schema$File): boolean {
        return new Date(this.cache[file.id].modifiedTime) < new Date(file.modifiedTime);
    }

}