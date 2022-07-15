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
            let channel = null;

            if(myURL?.pathname.includes("/channel/")){
                channel = myURL?.pathname?.split("/channel/")[1]?.split("/")[0]; 
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromChannel(channel, 1))];
            } else if(myURL?.pathname.includes("/user/")){
                channel = myURL?.pathname?.split("/user/")[1]?.split("/")[0]; 
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromChannel(channel, 2))];
            } else if(myURL?.pathname.includes("/c/")){
                channel = myURL?.pathname?.split("/c/")[1]?.split("/")[0]; 
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromChannel(channel, 3))];
            } else if(playlistId){
                ids = [...ids, ...(await YoutubeDownloader.getVideoIdsFromPlaylist(playlistId))];
            } else if(videoId){
                ids.push(videoId);
            }
        }
        return ids;
    }

    static getVideoIdsFromChannel = async (channelId, channelIdType) => {
        const max = process.env.CHANNEL_DOWNLOAD_MAX_DEPTH;
        const recurse = async (accumulator=[], cont=null) => {
            try {
                let res;
                if(max != -1 && accumulator.length >= max){
                    return accumulator;
                } else if(accumulator.length == 0){
                    res = await ytch.getChannelVideos({channelId, channelIdType});
                } else if(cont){
                    res = await ytch.getChannelVideosMore({continuation: cont   });
                } else {
                    return accumulator;
                }

                const {items, alertMessage, continuation} = res;
                if(alertMessage){
                    throw new Error(alertMessage);
                } else {
                    const videoIds = items?.map(({videoId}) => videoId);
                    return await recurse([...accumulator, ...videoIds], continuation);
                }
            } catch(e) {
                console.log("An error occured while getting channel videos");
                process.env.DEBUG && console.log(e);
                return accumulator;
            }
        }

        const videoIds = await recurse();
        return max == -1 ? videoIds : videoIds.slice(0, max);
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
        const res = await ytdl.getBasicInfo(this.videoId, this._getHeaders());
        const {
            title, 
            ownerChannelName, 
            description, 
            publishDate
        } = res?.videoDetails;
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

    _getHeaders = () => (
        {
            requestOptions: {
                headers: {
                    cookie: process.env.YT_USER_COOKIE
                }
            }
        }
    )
}