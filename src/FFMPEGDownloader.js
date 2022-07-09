const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const {sanitize} = require('string-sanitizer-fix');
const path = require('path');
const ManifestManager = require('./ManifestManager');

module.exports = class FFMPEGDownloader {
    static DEFAULT_OPTIONS = {
        downloadVideoStream: true,
        downloadAudioStream: true,
        fileFormat: process.env.VIDEO_FILE_FORMAT
    }

    constructor(videoId, options={}){
        this.videoId = videoId;
        this.options = {...FFMPEGDownloader.DEFAULT_OPTIONS, ...options};
        this.metaData = {};

        this.start = Date.now();
        this.audio = { downloaded: 0, total: Infinity };
        this.video = { downloaded: 0, total: Infinity };
        this.merged = { frame: 0, speed: '0x', fps: 0 };
    }

    download = async () => {
        try {
            await this.setMetaData();

            this.filepath = path.join(
                process.env.BASE_PATH, 
                `${sanitize.addUnderscore(this.metaData.title)} ${this.videoId || ""}.${this.options.fileFormat}`.trim()
            );

            console.log(`[Initiating Download] ${this.filepath}`);
            ManifestManager.addToManifest({
                id: this.videoId,
                dateDownloaded: new Date().toISOString(),
                ...this.metaData
            });

            this._launchFFMPEG();
            if(process.env.DRYRUN) return;
            this.setStreams();
            this._linkStreams();
        } catch(e) {
            console.log("[Download Failed]");
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
            windowsHide: true,
            stdio: [ 'inherit', 'inherit', 'inherit', 'pipe'] //Standard: stdin, stdout, stderr; Custom: progress
        };

        downloadAudioStream && options.stdio.push("pipe"); //add a pipe for audio
        downloadVideoStream && options.stdio.push("pipe"); //add a pipe for video

        process.env.DEBUG && console.log(`FFMPEG ARGS ${JSON.stringify(args, null, 4)}`);
        process.env.DEBUG && console.log(`FFMPEG OPTIONS ${JSON.stringify(options, null, 4)}`);
        if(process.env.DRYRUN) return;

        this.ffmpegProcess = cp.spawn(ffmpeg, args, options);
        
        this.ffmpegProcess.on('close', async () => {
            console.log(`[Download Complete]`);
            await ManifestManager.saveManifest();
        });

        this.ffmpegProcess.on('error', async e => {
            console.log("[FFMPEG ERROR]");
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