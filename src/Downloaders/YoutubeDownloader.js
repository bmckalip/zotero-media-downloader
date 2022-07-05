const ytdl = require('ytdl-core');
const FFMPEGDownloader = require('../FFMPEGDownloader');

module.exports = class Downloader extends FFMPEGDownloader {
    setMetaData = async () => {
        const {
            title, 
            ownerChannelName, 
            description, 
            publishDate
        } = (await ytdl.getInfo(this.videoId, this._getHeaders()))?.videoDetails;

        this.metaData = {
            title: title,
            artist: ownerChannelName,
            comment: description,
            date: new Date(publishDate).toISOString(),
            publisher: 'Youtube'
        };
    }

    setStreams = () => {
        this._getYoutubeStream({name: 'audio', quality: 'highestaudio'}).pipe(this.ffmpegProcess.stdio[4]);
        this._getYoutubeStream({name: 'video', quality: 'highestvideo'}).pipe(this.ffmpegProcess.stdio[5]);
    }

    _getYoutubeStream = ({name, quality}) => {
        const stream = ytdl(this.videoId, {quality, ...this._getHeaders()});
        stream.on('progress', (_, downloaded, total) => {
            this[name] = { downloaded, total };
        });
        return stream;
    }

    _getHeaders = () => ({requestOptions: {headers: {cookie: process.env.YT_USER_COOKIE}}})
}