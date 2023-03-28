const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const {sanitize} = require('string-sanitizer-fix');
const path = require('path');
const ManifestManager = require('./ManifestManager');
const {DOWNLOAD_STATUS} = require('./constants');
const fs = require('fs');

module.exports = class FFMPEGDriver {
    static DEFAULT_OPTIONS = {
        downloadVideoStream: true,
        downloadAudioStream: true,
        fileFormat: process.env.VIDEO_FILE_FORMAT
    }

    constructor(videoId, options={}){
        this.videoId = videoId;
        this.options = {...FFMPEGDriver.DEFAULT_OPTIONS, ...options};
        this.metaData = {};

        this.start = Date.now();
        this.audio = { downloaded: 0, total: Infinity };
        this.video = { downloaded: 0, total: Infinity };
        this.merged = { frame: 0, speed: '0x', fps: 0 };
        this.status = DOWNLOAD_STATUS.UNDOWNLOADED;
    }

    download = async () => {
        try {
            await this.setMetaData();
            
            this.filepath = path.join(
                process.env.BASE_PATH, 
                `${sanitize.addUnderscore(this.metaData.title)} ${this.videoId || ""}.${this.options.fileFormat}`.trim()
            );

            //delete the file if it exists - it is likely corrupted or paritally downloaded
            if(!process.env.DRYRUN && await fs.existsSync(this.filepath)){
                await fs.unlinkSync(this.filepath);
            }

            this._launchFFMPEG();
            if(process.env.DRYRUN) return;
            this.setStreams();
            this._linkStreams();
        } catch(e) {
            console.log(`[Download Failed] ${this?.metadata?.title || this.videoId}`);
            this.status = DOWNLOAD_STATUS.FAILED;
            console.log(e);
        }
    }

    formatMetaData = (values) => {
        return Object.entries(values).reduce((acc, [key, val]) => {
            acc.push(`-metadata`);
            acc.push(`${key}=${val}`);
            return acc;
        }, []);
    }

    _launchFFMPEG = () => {
        const {
            downloadAudioStream,
            downloadVideoStream
        } = this.options;
        const args = [
            '-xerror',
            '-loglevel', '8', '-hide_banner', // Remove ffmpeg's console spamming
            '-progress', 'pipe:3', // Redirect/Enable progress messages
            ...(downloadAudioStream ? ['-i', 'pipe:4'] : []), // set audio input
            ...(downloadVideoStream ? ['-i', 'pipe:5'] : []), // set video input
            ...(downloadAudioStream ? ['-map', '0:a'] : []), //map audio input from stream
            ...(downloadVideoStream ? ['-map', '1:v'] : []), // map video input from stream
            '-c:v', 'copy', // Keep encoding
            ...this.formatMetaData(this.metaData),  //add meta data from YT JSON response
            this.filepath, // Define output file
        ];

        const options = {
            // windowsHide: true,
            detached: true,
            stdio: [ 'inherit', 'inherit', 'inherit', 'pipe'] //Standard: stdin, stdout, stderr; Custom: progress
            // stdio: [ 'inherit', 'inherit', 'pipe', 'pipe'] //Standard: stdin, stdout, stderr; Custom: progress
        };

        downloadAudioStream && options.stdio.push("pipe"); //add a pipe for audio
        downloadVideoStream && options.stdio.push("pipe"); //add a pipe for video
        

        if(process.env.DRYRUN) return;

        this.ffmpegProcess = cp.spawn(ffmpeg, args, options);

        // this.ffmpegProcess.stdio[2].on('data', err => {
        //     console.log(err.toString());
        //     console.log("HELLO");
        //     // this.ffmpegProcess.kill('SIGKILL');
        //     kill(this.ffmpegProcess.pid, 'SIGKILL');
        // })

        console.log(`[Downloading] ${this.metaData.title}`);
        this.status = DOWNLOAD_STATUS.DOWNLOADING;

        this.ffmpegProcess.on('close', async () => {
            console.log(`[Download Complete] ${this.metaData.title}`);
            this.status = DOWNLOAD_STATUS.DOWNLOADED;
            ManifestManager.addToManifest({
                id: this.videoId,
                dateDownloaded: new Date().toISOString(),
                ...this.metaData
            });
            
            await ManifestManager.saveManifest();
        });

        this.ffmpegProcess.on('error', async e => {
            console.log(`[FFMPEG ERROR] ${this.metaData.title} - failed to download`);
            this.status = DOWNLOAD_STATUS.FAILED;
            process.env.DEBUG && console.log(e);
        });

    }

    _linkStreams = () => {
        this.ffmpegProcess.stdio[3].on('data', chunk => {
            const lines = chunk.toString().trim().split('\n');
            const args = {};
            for (const l of lines) {
                const [key, value] = l.split('=');
                args[key.trim()] = value.trim();
            }
            this.merged = args;
        });
    }
}