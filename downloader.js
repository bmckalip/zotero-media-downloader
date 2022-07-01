const cp = require('child_process');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const readline = require('readline');
const {sanitize} = require('string-sanitizer-fix');
const path = require('path');
const fs = require('fs/promises');

module.exports = class Downloader {
    static DEFAULT_MANIFEST = {
        created: new Date().toISOString(),
        videos: []
    }

    static manifest;
    static loadManifest = async basePath => {
        if(!Downloader.manifest){
            try {
                //load an existing manifest
                const manifestLocation = path.join(basePath, 'manifest.json');
                const rawData = await fs.readFile(manifestLocation);
                Downloader.manifest = JSON.parse(rawData);
            } catch(e) {
                //create a default manifest and save it to file immediately
                console.log(`[Building New Manifest]`);
                Downloader.manifest = Downloader.DEFAULT_MANIFEST;
                Downloader.saveManifest(basePath);
            }
        }
        console.log(`[Loading Manifest] Loaded ${Downloader.manifest.videos.length} existing videos.`)
    }

    static saveManifest = async basePath => {
        await fs.writeFile(
            path.join(
                basePath, 
                'manifest.json'
            ), 
            JSON.stringify(Downloader.manifest, null, 4)
        );
    }

    static toMB = i => (i / 1024 / 1024).toFixed(2)

    static DEFAULT_OPTIONS = {
        progressbarInterval: 1000,
        basePath: '/',
        subDirectory: '/',
        format: 'mp4'
    }

    constructor(options){
        this.options = {...Downloader.DEFAULT_OPTIONS, ...options};
        this._init();
    }

    downloadVideo = async (videoId, filepath) => {
        try {
            this.videoId = videoId;
            this.filepath = filepath || await this._getFilePath();

            console.log(`[Downloading] ${this.filepath}`);
            this._init();
            this._addToManifest();
            this._launchFFMPEG();
            this._getAudio();
            this._getVideo();
            this._linkStreams();
        } catch(e) {
            console.log("[Download Failed]");
            console.log(e);
        }
    }

    getInfo = async () => await ytdl.getInfo(this.videoId, {requestOptions: {headers: {cookie: this.options.cookie}}})

    _getFilePath = async () => {
        const { videoDetails } = await this.getInfo();
        this.videoDetails = videoDetails;
        return path.join(
            this.options.basePath, 
            this.options.subDirectory, 
            `${sanitize.addUnderscore(videoDetails.title)} ${this.videoId || ""}.${this.options.format}`
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
        this.start = Date.now();
    }

    _addToManifest = () => {
        const { title, videoId, ownerChannelName, publishDate } = this.videoDetails;
        Downloader.manifest.videos.push({
            id: videoId,
            title: title,
            author: ownerChannelName,
            datePublished: publishDate, 
            dateDownloaded: new Date().toISOString()
        });
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
          }
        );

        this.ffmpegProcess.on('close', async () => {
            console.log(`[Download Complete]`);
            await Downloader.saveManifest(this.options.basePath);
        });
    }

    _getVideo = () => {
        const video = ytdl(this.videoId, {quality: 'highestvideo', requestOptions: {headers: {cookie: this.options.cookie}}});
        video.on('progress', (_, downloaded, total) => {
            this.video = { downloaded, total };
        });
        video.pipe(this.ffmpegProcess.stdio[5]);
    }

    _getAudio = () => {
        const audio = ytdl(this.videoId, {quality: 'highestaudio', requestOptions: {headers: {cookie: this.options.cookie}}});
        audio.on('progress', (_, downloaded, total) => {
            this.audio = { downloaded, total };
        });
        audio.pipe(this.ffmpegProcess.stdio[4]);
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