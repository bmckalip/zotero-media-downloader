const axios = require('axios').default;
const ManifestManager = require('./ManifestManager');
const YoutubeDownloader = require('./Downloaders/YoutubeDownloader');
const {DOWNLOAD_STATUS} = require('./constants');

module.exports = class DownloadManager {
    static downloadQueue = [];

    static buildManifest = async () => {
        await ManifestManager.loadManifest(process.env.BASE_PATH);
    }

    static DOWNLOADERS = {
        YOUTUBE: YoutubeDownloader
    }

    static getZoteroUrls = async collectionName => {
        const { 
            ZOTERO_API_KEY, 
            ZOTERO_USER_ID, 
            DEBUG
        } = process.env;

        try {
            const collectionsUrl = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections`;
            const collections = await axios.get(collectionsUrl, {headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
            const {key} = collections.data.find(({data}) => data.name == collectionName);

            if(key){
                const itemsUrl = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections/${key}/items`;
                let items = [];
                const limit = 100;
                let start = 0;
                let totalResults = Infinity;
                while(items.length < totalResults) {
                    const params = {
                        sort: 'dateAdded', 
                        direction: 'desc',
                        limit,
                        start
                    }
                    const {data, headers} = await axios.get(itemsUrl, {params, headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
                    items = [...items, ...data];
                    totalResults = headers['total-results'];
                    start += limit;
                }
                return Array.from(new Set(items.map(({data}) => data.url)));
            }
        } catch(e) {
            console.log(`[Zotero API error]`)
            DEBUG && console.log(e);
        }
    } 

    static addCollectionToQueue = async (Downloader, collectionName, options) => {
        const { 
            DEBUG, 
            CHECK_ZOTERO_INTERVAL_MINUTES
        } = process.env;
    
        try {
            const existingVideoIds = [];
            const newVideoIds = [];
            const retryMessage = `Checking again in ${CHECK_ZOTERO_INTERVAL_MINUTES} minute(s).`;

            const manifestVideoIds = ManifestManager.manifest.videos.map(({id}) => id);
            const collection = await DownloadManager.getZoteroUrls(collectionName);
            const zoteroVideoIds = Array.from(new Set(await Downloader.getVideoIdsFromCollection(collection)));
            
            zoteroVideoIds.forEach(zvid => (manifestVideoIds.includes(zvid) ? existingVideoIds : newVideoIds).push(zvid));

            const currentQueue = DownloadManager.downloadQueue.map(({id}) => id);
            for (let i = 0; i < newVideoIds.length; i++) {
                const id = newVideoIds[i];
                if(!currentQueue.includes(id)){
                    const downloader = new Downloader(id, options);
                    DownloadManager.downloadQueue.push({id, downloader});
                }
            }

            if(newVideoIds.length > 0){
                console.log(`[Checking ${collectionName}] found ${newVideoIds.length} new video(s), adding to Queue. ${retryMessage}`);
                DEBUG && console.log(`[Added IDs to Queue] ${JSON.stringify(newVideoIds)}`);
            } else {
                DEBUG && console.log(`[Checking ${collectionName}] up to date. ${retryMessage}`);
                DEBUG && console.log(`New Videos: ${newVideoIds.length} | Existing Videos: ${existingVideoIds.length} | Total in ${collectionName} Collection: ${zoteroVideoIds.length}`);
                DEBUG && console.log(`Existing Video IDs: ${JSON.stringify(zoteroVideoIds, null, 4)}`);
            }
        } catch(e) {
            console.log(`[Error occured while adding to queue]`);
            DEBUG && console.log(e);
        }
    }

    static downloadAll = async () => {
        const {DOWNLOAD_BATCH_SIZE, DEBUG} = process.env;

        const undownloaded = [];
        const downloading = [];
        const downloaded = [];
        const failed = [];

        DownloadManager.downloadQueue.forEach(({downloader}) => {
            switch(downloader?.status) {
                case DOWNLOAD_STATUS.UNDOWNLOADED:
                    undownloaded.push(downloader);
                    break;
                case DOWNLOAD_STATUS.DOWNLOADING:
                    downloading.push(downloader);
                    break;
                case DOWNLOAD_STATUS.DOWNLOADED:
                    downloaded.push(downloader);
                    break;
                case DOWNLOAD_STATUS.FAILED:
                    failed.push(downloader);
            }
        });

        if(DEBUG){
            console.log(`undownloaded: ${undownloaded.length}`);
            console.log(`downloading: ${downloading.length}`);
            console.log(`downloaded: ${downloaded.length}`);
            console.log(`failed: ${failed.length}`);
        }

        if(undownloaded.length > 0){
            const numToDownload = DOWNLOAD_BATCH_SIZE - downloading.length;
            for (let i = 0; i < numToDownload; i++) {
                const downloader = undownloaded[i];
                downloader?.download && await downloader.download();
            }
        }

        setTimeout(DownloadManager.downloadAll, 5000);
    }

    static updateDownloadQueue = async () => {
        const {
            ZOTERO_VIDEO_COLLECTION_NAME,
            ZOTERO_AUDIO_COLLECTION_NAME,
            VIDEO_FILE_FORMAT,
            AUDIO_FILE_FORMAT,
        }  = process.env;
    
        if(ZOTERO_VIDEO_COLLECTION_NAME){
            await DownloadManager.addCollectionToQueue(
                DownloadManager.DOWNLOADERS.YOUTUBE, 
                ZOTERO_VIDEO_COLLECTION_NAME,
                {fileFormat: VIDEO_FILE_FORMAT}
            );
        }
    
        if(ZOTERO_AUDIO_COLLECTION_NAME){
            await DownloadManager.addCollectionToQueue(
                DownloadManager.DOWNLOADERS.YOUTUBE, 
                ZOTERO_AUDIO_COLLECTION_NAME,
                {fileFormat: AUDIO_FILE_FORMAT, downloadVideoStream: false}
            );
        }
    }
}