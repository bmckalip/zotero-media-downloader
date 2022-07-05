const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const {sanitize} = require('string-sanitizer-fix');
const path = require('path');
const ManifestManager = require('./ManifestManager');

module.exports = class FFMPEGDownloader {
    constructor(videoId, options={}){
        this.videoId = videoId;
        this.options = options;
        this.metaData = {};

        this.start = Date.now();
        this.audio = { downloaded: 0, total: Infinity };
        this.video = { downloaded: 0, total: Infinity };
        this.merged = { frame: 0, speed: '0x', fps: 0 };
    }

    download = async () => {
        try {
            await this.setMetaData();
            this.filepath = this.getFilePath();
            console.log(`[Initiating Download] ${this.filepath}`);
            ManifestManager.addToManifest({
                id: this.videoId,
                dateDownloaded: new Date().toISOString(),
                ...this.metaData
            });
            this._launchFFMPEG();
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

    getFilePath = () => {
        return path.join(
            process.env.BASE_PATH, 
            process.env.SUB_DIRECTORY, 
            `${sanitize.addUnderscore(this.metaData.title)} ${this.videoId || ""}.${process.env.FILE_FORMAT}`.trim()
        );
    }

    _launchFFMPEG = () => {        
        this.ffmpegProcess = cp.spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner', // Remove ffmpeg's console spamming
            '-progress', 'pipe:3', // Redirect/Enable progress messages
            '-i', 'pipe:4', '-i', 'pipe:5', // Set inputs
            '-map', '0:a', '-map', '1:v', // Map audio & video from streams
            '-c:v', 'copy', // Keep encoding
            ...this.formatMetaData(this.metaData),  //add meta data from YT JSON response
            this.filepath, // Define output file
          ], {
            windowsHide: true,
            stdio: [
              'inherit', 'inherit', 'inherit', //Standard: stdin, stdout, stderr
              'pipe', 'pipe', 'pipe', //Custom: pipe:3, pipe:4, pipe:5
            ],
          }
        );

        this.ffmpegProcess.on('close', async () => {
            console.log(`[Download Complete]`);
            await ManifestManager.saveManifest();
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