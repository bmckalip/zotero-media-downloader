const axios = require('axios').default;
const FFMPEGDownloader = require('./FFMPEGDownloader');
const ManifestManager = require('./ManifestManager');
const YoutubeDownloader = require('./Downloaders/YoutubeDownloader');

module.exports = class DownloadManager {
    static buildManifest = () => {
        ManifestManager.loadManifest(process.env.BASE_PATH);
    }

    static DOWNLOADERS = {
        YOUTUBE: YoutubeDownloader
    }

    static getZoteroUrls = async () => {
        const { 
            ZOTERO_API_KEY, 
            ZOTERO_USER_ID, 
            ZOTERO_COLLECTION_NAME,
            DEBUG
        } = process.env;

        try {
            const collectionsUrl = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections`;
            const collections = await axios.get(collectionsUrl, {headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
            const {key} = collections.data.find(({data}) => data.name == ZOTERO_COLLECTION_NAME);
            if(key){
                const itemsUrl = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections/${key}/items`;
                let urls = [];
                const limit = 100;
                let start = 0;
                let totalResults = Infinity;
                while(urls.length < totalResults) {
                    const params = {
                        sort: 'dateAdded', 
                        direction: 'desc',
                        limit,
                        start
                    }
                    const res = await axios.get(itemsUrl, {params, headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
                    urls = [...urls, ...res.data.map(({data}) => data.url)];
                    totalResults = res.headers['total-results'];
                    start += limit;
                }
                return urls;
            }
        } catch(e) {
            console.log(`[Zotero API error]`)
            DEBUG && console.log(e);
        }
    } 

    static downloadFromUrls = async Downloader => {
        const { 
            DEBUG, 
            CHECK_ZOTERO_INTERVAL_MINUTES
        } = process.env;
    
        try {
            const retryMessage = `Checking again in ${CHECK_ZOTERO_INTERVAL_MINUTES} minute(s).`;
            const zoteroVideoIds = (await DownloadManager.getZoteroUrls()).map(url => url.split('?v=')[1]);
            const manifestVideoIds = ManifestManager.manifest.videos.map(({id}) => id);

            const existingVideoIds = [];
            const newVideoIds = [];
            zoteroVideoIds.forEach(zvid => (manifestVideoIds.includes(zvid) ? existingVideoIds : newVideoIds).push(zvid));
            
            if(newVideoIds.length > 0){
                console.log(`[Checking Zotero] found ${newVideoIds.length} new video(s), downloading. ${retryMessage}`);
                DEBUG && console.log(`[Downloading IDs] ${newVideoIds}`);

                for (let i = 0; i < newVideoIds.length; i++) {
                    const downloader = new Downloader(newVideoIds[i]);
                    await downloader.download();
                }
            } else {
                DEBUG && console.log(`[Checking Zotero] up to date. ${retryMessage}`);
                DEBUG && console.log(`New Videos: ${newVideoIds.length} | Existing Videos: ${existingVideoIds.length} | Total in Zotero Collection: ${zoteroVideoIds.length}`);
                DEBUG && console.log(zoteroVideoIds);
            }
        } catch(e) {
            console.log(`[Error occured while executing download for zotero collection]`);
            DEBUG && console.log(e);
        }
    }
}