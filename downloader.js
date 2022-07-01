const cp = require('child_process');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const readline = require('readline');
const {sanitize} = require('string-sanitizer-fix');
const path = require('path');
const fs = require('fs/promises');

module.exports = class Downloader {
    static DEFAULT_MANIFEST = {
        created: new Date().toDateString(),
        videos: []
    }

    static manifest;
    static loadManifest = async (basePath, intervalMinutes=3) => {
        if(!Downloader.manifest){
            try {
                //load an existing manifest
                const manifestLocation = path.join(basePath, 'manifest.json');
                const rawData = await fs.readFile(manifestLocation);
                Downloader.manifest = JSON.parse(rawData);
            } catch(e) {
                //create a default manifest and save it to file immediately
                Downloader.manifest = DEFAULT_MANIFEST;
                Downloader.saveManifest(basePath);
            }
        }

        //save the manifest to file periodically
        setInterval(() => Downloader.saveManifest(basePath), intervalMinutes * 60 * 1000);

        console.log(`[Loading Manifest] Loaded ${Downloader.manifest.videos.length} existing videos. Saving to file every ${intervalMinutes} minute(s)`)
    }

    static saveManifest = basePath => {
        console.log(`[Saving Manifest] Recorded ${Downloader.manifest.videos.length} videos in the manifest.`)
        fs.writeFile(
            path.join(
                basePath, 
                'manifest.json'
            ), 
            JSON.stringify(Downloader.manifest, null, 4)
        );
    }

    static onDownloadComplete = async ({videoDetails, url}) => {
        const { title, videoId, ownerChannelName, publishDate } = videoDetails;
        console.log(`[Download Completed] ${title} ${url}`);
        Downloader.manifest.videos.push({
            id: videoId,
            title: title,
            author: ownerChannelName,
            datePublished: publishDate,
            dateDownloaded: new Date().toISOString()
        });
    }

    static toMB = i => (i / 1024 / 1024).toFixed(2)

    static DEFAULT_OPTIONS = {
        showProgress: false,
        progressbarInterval: 1000,
        basePath: '/',
        subDirectory: '/',
        format: 'mp4',
        onDownloadComplete: Downloader.onDownloadComplete
    }

    constructor(options){
        this.options = {...Downloader.DEFAULT_OPTIONS, ...options};
        this._init();
    }

    downloadVideo = async (url, filepath) => {
        try {
            this.url = url;
            this.filepath = filepath || await this._getFilePath();

            console.log(`[Downloading] ${this.filepath}`);
            this._init();
            this._launchFFMPEG();
            this._getAudio();
            this._getVideo();
            this._linkStreams();
        } catch(e) {
            console.log("[Download Failed]");
            console.log(e);
        }
    }

    getInfo = async url => await ytdl.getInfo(url, {requestOptions: {headers: {cookie: this.options.cookie}}})

    _getFilePath = async () => {
        const { videoDetails } = await this.getInfo(this.url);
        this.videoDetails = videoDetails;
        const [baseURL, videoId] = this.url.split('?v=');
        return path.join(
            this.options.basePath, 
            this.options.subDirectory, 
            `${sanitize.addUnderscore(videoDetails.title)} ${videoId || ""}.${this.options.format}`
        );
    }

    _getFormattedMetaData = () => {
        const {
            title, 
            description, 
            ownerChannelName,
            publishDate
        } = this.videoDetails;

        const metaDataValues = {
            title: title,
            artist: ownerChannelName,
            comment: description,
            date: new Date(publishDate).toISOString(),
            publisher: 'Youtube'
        };

        return Object.entries(metaDataValues).reduce((acc, [key, val]) => {
            acc.push(`-metadata`);
            acc.push(`${key}=${val}`);
            return acc;
        }, []);
    }

    _init = () => {
        this.audio = { downloaded: 0, total: Infinity };
        this.video = { downloaded: 0, total: Infinity };
        this.merged = { frame: 0, speed: '0x', fps: 0 };
        this.progressbarHandle = null;
        this.start = Date.now();
    }

    _launchFFMPEG = () => {        
        this.ffmpegProcess = cp.spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner', // Remove ffmpeg's console spamming
            '-progress', 'pipe:3', // Redirect/Enable progress messages
            '-i', 'pipe:4', '-i', 'pipe:5', // Set inputs
            '-map', '0:a', '-map', '1:v', // Map audio & video from streams
            '-c:v', 'copy', // Keep encoding
            ...(this._getFormattedMetaData()), //add meta data from YT JSON response
            this.filepath, // Define output file
          ], {
            windowsHide: true,
            stdio: [
              'inherit', 'inherit', 'inherit', //Standard: stdin, stdout, stderr
              'pipe', 'pipe', 'pipe', //Custom: pipe:3, pipe:4, pipe:5
            ],
          });
          
          this.ffmpegProcess.on('close', () => {
            this.options.onDownloadComplete(this);
            clearInterval(this.progressbarHandle);
          });
    }

    _getVideo = () => {
        const video = ytdl(this.url, {quality: 'highestvideo', requestOptions: {headers: {cookie: this.options.cookie}}});
        video.on('progress', (_, downloaded, total) => {
            this.video = { downloaded, total };
        });
        video.pipe(this.ffmpegProcess.stdio[5]);
    }

    _getAudio = () => {
        const audio = ytdl(this.url, {quality: 'highestaudio', requestOptions: {headers: {cookie: this.options.cookie}}});
        audio.on('progress', (_, downloaded, total) => {
            this.audio = { downloaded, total };
        });
        audio.pipe(this.ffmpegProcess.stdio[4]);
    }

    _linkStreams = () => {
        this.ffmpegProcess.stdio[3].on('data', chunk => {
        if (!this.progressbarHandle) {
            this.progressbarHandle = setInterval(this._showProgress, this.options.progressbarInterval);
        }

        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
            const [key, value] = l.split('=');
            args[key.trim()] = value.trim();
        }
        this.merged = args;
      });
    }

    _showProgress = () => {
        if(!this.options.showProgress) return;
        readline.cursorTo(process.stdout, 0);
        const {toMB} = Downloader;
    
        process.stdout.write(`Audio  | ${(this.audio.downloaded / this.audio.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(this.audio.downloaded)}MB of ${toMB(this.audio.total)}MB).${' '.repeat(10)}\n`);
    
        process.stdout.write(`Video  | ${(this.video.downloaded / this.video.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(this.video.downloaded)}MB of ${toMB(this.video.total)}MB).${' '.repeat(10)}\n`);
    
        process.stdout.write(`Merged | processing frame ${this.merged.frame} `);
        process.stdout.write(`(at ${this.merged.fps} fps => ${this.merged.speed}).${' '.repeat(10)}\n`);
    
        process.stdout.write(`running for: ${((Date.now() - this.start) / 1000 / 60).toFixed(2)} Minutes.`);
        readline.moveCursor(process.stdout, 0, -3);
    }
}