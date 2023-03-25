import glob from 'glob';
import { drive_v3, google } from 'googleapis';
import cron from 'node-cron';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { FileCache } from './automanager/fileCache';
import { ImportManager } from './importManager';
import { PlotManager } from './plotManager';
import { Manager } from '../interfaces/managers';
import { factory } from '../logger';

const logger = factory('AutoManager');
const importManager = ImportManager.getManager();
const plotManager = PlotManager.getManager();

export class DriveManager implements Manager {

    protected static _instance: DriveManager;
    private fileCache: FileCache = new FileCache();

    static getManager(): DriveManager {
        if (this._instance) return this._instance;

        this._instance = new DriveManager();

        return this._instance;
    }

    public async run(): Promise<void> {
        logger.info('Starting auto update plots');

        const cronTask = cron.schedule('0 * * * *', async () => { // Every hour
            logger.info('Running auto update');

            try {
                const driveService = this.getDriveService();
                const files = await this.getDriveDataFiles(driveService);

                logger.info(`Found ${files.length} files`);

                for await (const file of files) {
                    if (!this.fileCache.hasFile(file.id) || this.fileCache.isFileNewer(file)) {
                        logger.info(`Found new file: ${file.name}`);
                        this.fileCache.upsertFile(file);

                        await this.downloadFile(driveService, file, path.join(__dirname, '..', '..', 'data', 'download', file.name));
                        logger.info(`Downloaded file: ${file.name}`);

                        await importManager.import(path.join(__dirname, '..', '..', 'data', 'download', file.name));
                        logger.info(`Imported file: ${file.name}`);

                        await plotManager.runAllPlots({});
                        logger.info(`Plotted all plots`);

                        await this.uploadPlots();
                        logger.info(`Uploaded plots`);

                        await importManager.clean();
                        logger.info(`Cleaned data`);

                        await plotManager.clean();
                        logger.info(`Cleaned plots`);
                    }
                }
            } catch (err) {
                logger.error(err);
            }
        });

        cronTask.now();
    }

    private async uploadPlots(): Promise<void> {
        const folderName = new Date().toISOString().split('T')[0].substring(0, 7);
        let folderId = '';

        if (!await this.driveFolderExists(folderName)) {
            folderId = await this.createDriveFolder(folderName);
        } else {
            folderId = await this.getDriveFolderId(folderName);
        }

        const files = await glob('**/*', { cwd: path.join(__dirname, '..', '..', 'images'), nodir: true });
        logger.info(`Found ${files.length} plots to upload`);

        const plotAmount = files.length;
        let uploadedAmount = 1;

        for await (const file of files) {
            const directory = file.split(path.sep).slice(-2)[0];
            logger.info(`Uploading plot ${uploadedAmount++}/${plotAmount}: ${file} to directory: ${directory} (parent: ${folderId})`);

            let plotFolderId = '';

            if (!await this.driveFolderExists(directory, folderId)) {
                plotFolderId = await this.createDriveFolder(directory, folderId);
            } else {
                plotFolderId = await this.getDriveFolderId(directory, folderId);
            }

            try {
                await this.uploadFile(path.join(__dirname, '..', '..', 'images', file), plotFolderId);
            } catch (err) {
                try {
                    await this.uploadFile(path.join(__dirname, '..', '..', 'images', file), plotFolderId);
                } catch (err) {
                    logger.error(err);
                }
            }
        }
    }

    private async uploadFile(filePath: string, folderId: string): Promise<string> {
        const driveService = this.getDriveService();
        const fileName = path.basename(filePath);

        // eslint-disable-next-line @typescript-eslint/return-await
        return new Promise((resolve, reject) => {
            driveService.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: 'image/png',
                    parents: [folderId],
                },
                media: {
                    mimeType: 'image/png',
                    body: createReadStream(filePath)
                },
                fields: 'id',
            }, (err, res) => {
                if (err) return reject(err);
                resolve(res.data.id);
            });
        });
    }

    private async getDriveFolderId(name: string, parent?: string): Promise<string> {
        const driveService = this.getDriveService();

        const folderId = parent || process.env.DRIVE_GRAPHS;

        // eslint-disable-next-line @typescript-eslint/return-await
        return new Promise((resolve, reject) => {
            driveService.files.list({
                pageSize: 10,
                q: `'${folderId}' in parents and trashed=false and name='${name}'`,
                fields: 'nextPageToken, files(id, name)',
            }, (err, res) => {
                if (err) return reject(err);
                resolve(res.data.files[0].id);
            });
        });
    }

    private async driveFolderExists(name: string, parent?: string): Promise<boolean> {
        const driveService = this.getDriveService();

        const folderId = parent || process.env.DRIVE_GRAPHS;

        // eslint-disable-next-line @typescript-eslint/return-await
        return new Promise((resolve, reject) => {
            driveService.files.list({
                pageSize: 10,
                q: `'${folderId}' in parents and trashed=false and name='${name}'`,
                fields: 'nextPageToken, files(id, name)',
            }, (err, res) => {
                if (err) return reject(err);
                resolve(res.data.files.length > 0);
            });
        });
    }

    private async createDriveFolder(name: string, parent?: string): Promise<string> {
        const driveService = this.getDriveService();

        const folderId = parent || process.env.DRIVE_GRAPHS;

        // eslint-disable-next-line @typescript-eslint/return-await
        return new Promise((resolve, reject) => {
            driveService.files.create({
                requestBody: {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [folderId],
                },
                fields: 'id',
            }, (err, res) => {
                if (err) return reject(err);
                resolve(res.data.id);
            });
        });
    }

    private getDriveService(): drive_v3.Drive {
        const KEYFILEPATH = path.join(__dirname, '..', '..', 'credentials', process.env.CREDENTIALS);
        const SCOPES = ['https://www.googleapis.com/auth/drive'];
    
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: SCOPES,
        });
        const driveService = google.drive({ version: 'v3', auth });
        return driveService;
    }

    private getDriveDataFiles(driveService: drive_v3.Drive): Promise<drive_v3.Schema$File[]> {
        return new Promise((resolve, reject) => {
            driveService.files.list({
                pageSize: 10,
                q: `'${process.env.DRIVE_DATA}' in parents and trashed=false`,
                fields: 'nextPageToken, files(id, name)',
            }, (err, res) => {
                if (err) return reject(err);
                resolve(res.data.files);
            });
        });
    }

    private downloadFile(driveService: drive_v3.Drive, file: drive_v3.Schema$File, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const fileWriter = createWriteStream(filePath, { flags: 'w+' });

            driveService.files.get({
                fileId: file.id,
                alt: 'media',
            }, 
            { responseType: 'stream' }, 
            (err, { data }) => {
                if (err) return reject(err);

                data
                    .on('end', () => resolve())
                    .on('error', (err) => {
                        reject(err);
                    })
                    .pipe(fileWriter);
            });
        });
    }
}