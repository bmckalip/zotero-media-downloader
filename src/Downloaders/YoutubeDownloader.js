const ytdl = require('ytdl-core');
const ytpl = require('youtube-playlist');
const ytch = require('yt-channel-info');

const FFMPEGDownloader = require('../FFMPEGDownloader');

module.exports = class YoutubeDownloader extends FFMPEGDownloader {
    static getVideoIdsFromCollection = async collection => {
        let ids = [];
        for (let i = 0; i < collection.length; i++) {
            const urlString = collection[i];
            const myURL = new URL(urlString);
            const playlistId = myURL.searchParams.get('list');
            const videoId = myURL.searchParams.get('v');
            const channelName = myURL?.pathname?.split("/c/")[1]?.split("/")[0];

            if(playlistId){
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromPlaylist(playlistId))];
            } else if(channelName){
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromChannel(channelName))];
            } else if(videoId){
                ids.push(videoId);
            }
        }
        return ids;
    }

    static getVideoIdsFromChannel = async channelId => {
        try {
            const {items, alertMessage} = await ytch.getChannelVideos({channelId, channelIdType: 3});
            if(alertMessage) {
                throw new Error(alertMessage);
            } else {
                return items?.map(({videoId}) => videoId) || [];
            }
        } catch(e) {
            console.log("An error occured while getting channel videos");
            process.env.DEBUG && console.log(e);
        }
    }

    static getVideoIdsFromPlaylist = async playlistId => {
        try {
            // TODO fix this. the underlying package this function relies on is broken and returns no urls.
            const url = `https://www.youtube.com/playlist?list=${playlistId}`;
            const {data} = await ytpl(url, 'id');
            return data?.playlist || [];
        } catch(e) {
            console.log("An error occured while getting playlist videos");
            process.env.DEBUG && console.log(e);
        }
        return [];
    }

    setMetaData = async () => {
        const {
            title, 
            ownerChannelName, 
            description, 
            publishDate
        } = (await ytdl.getInfo(this.videoId, this._getHeaders()))?.videoDetails;

        this.metaData = {
            title: title || "",
            artist: ownerChannelName || "",
            comment: description || "",
            date: new Date(publishDate).toISOString(),
            publisher: 'Youtube'
        };
    }

    setStreams = () => {
        if(this.options.downloadAudioStream){
            this._getYoutubeStream({name: 'audio', quality: 'highestaudio'}).pipe(this.ffmpegProcess.stdio[4]);
        }
        
        if(this.options.downloadVideoStream){
            this._getYoutubeStream({name: 'video', quality: 'highestvideo'}).pipe(this.ffmpegProcess.stdio[5]);
        }
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