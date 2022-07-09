const axios = require('axios').default;
const FFMPEGDownloader = require('./FFMPEGDownloader');
const ManifestManager = require('./ManifestManager');
const YoutubeDownloader = require('./Downloaders/YoutubeDownloader');
const Downloader = require('./Downloaders/YoutubeDownloader');

module.exports = class DownloadManager {
    static buildManifest = () => {
        ManifestManager.loadManifest(process.env.BASE_PATH);
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
                return items.map(({data}) => data.url);
            }
        } catch(e) {
            console.log(`[Zotero API error]`)
            DEBUG && console.log(e);
        }
    } 

    static downloadCollection = async (Downloader, collectionName, options) => {
        const { 
            DEBUG, 
            CHECK_ZOTERO_INTERVAL_MINUTES
        } = process.env;
    
        try {
            const retryMessage = `Checking again in ${CHECK_ZOTERO_INTERVAL_MINUTES} minute(s).`;
            const zoteroVideoIds = (await DownloadManager.getZoteroUrls(collectionName)).map(url => url.split('?v=')[1]);
            const manifestVideoIds = ManifestManager.manifest.videos.map(({id}) => id);

            const existingVideoIds = [];
            const newVideoIds = [];
            zoteroVideoIds.forEach(zvid => (manifestVideoIds.includes(zvid) ? existingVideoIds : newVideoIds).push(zvid));
            
            if(newVideoIds.length > 0){
                console.log(`[Checking ${collectionName}] found ${newVideoIds.length} new video(s), downloading. ${retryMessage}`);
                DEBUG && console.log(`[Downloading IDs] ${newVideoIds}`);

                for (let i = 0; i < newVideoIds.length; i++) {
                    const downloader = new Downloader(newVideoIds[i], options);
                    await downloader.download();
                }
            } else {
                DEBUG && console.log(`[Checking ${collectionName}] up to date. ${retryMessage}`);
                DEBUG && console.log(`New Videos: ${newVideoIds.length} | Existing Videos: ${existingVideoIds.length} | Total in ${collectionName} Collection: ${zoteroVideoIds.length}`);
                DEBUG && console.log(`Existing Video IDs: ${JSON.stringify(zoteroVideoIds, null, 4)}`);
            }
        } catch(e) {
            console.log(`[Error occured while executing download for zotero collection]`);
            DEBUG && console.log(e);
        }
    }
}