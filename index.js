const Downloader = require('./downloader');
const getURLs = require('./zoteroConnector');

const dotenv = require('dotenv');
const dotenvParseVariables = require('dotenv-parse-variables');

let env = dotenv.config({})
if (env.error) throw env.error;
env = dotenvParseVariables(env.parsed);

const { 
    DEBUG, 
    CHECK_ZOTERO_INTERVAL_MINUTES,
    ZOTERO_API_KEY, 
    ZOTERO_USER_ID, 
    ZOTERO_COLLECTION_NAME,
    YT_USER_COOKIE, 
    FILE_FORMAT, 
    BASE_PATH
} = env;

const loop = async downloader => {
    try {
        const urls = await getURLs({
            ZOTERO_API_KEY, 
            ZOTERO_USER_ID, 
            ZOTERO_COLLECTION_NAME,
        });
    
        const zoteroVideoIds = urls.map(url => url.split('?v=')[1]);
        const manifestVideoIds = Downloader.manifest.videos.map(({id}) => id);
        const existingVideoIds = [];
        const newVideoIds = [];
    
        zoteroVideoIds.forEach(zvid => (manifestVideoIds.includes(zvid) ? existingVideoIds : newVideoIds).push(zvid));
    
        DEBUG && console.log(`[Downloading] ${newVideoIds}`);
    
        const retryMessage = `Checking again in ${CHECK_ZOTERO_INTERVAL_MINUTES} minute(s).`;
        if(newVideoIds.length > 0){
            console.log(`[Checking Zotero] found ${newVideoIds.length} new video(s), downloading. ${retryMessage}`);
            for (let i = 0; i < newVideoIds.length; i++) {
                await downloader.downloadVideo(newVideoIds[i]);
            }
        } else {
            DEBUG && console.log(`[Checking Zotero] Nothing to download. ${existingVideoIds.length} / ${zoteroVideoIds.length} up to date. ${retryMessage}`);
        }
    } catch(e) {
        console.log(`[Download error occurred]`);
        DEBUG && console.log(e);
    }
}

const main = async () => {
    await Downloader.loadManifest(BASE_PATH);
    const downloader = new Downloader({
        cookie: YT_USER_COOKIE,
        format: FILE_FORMAT,
        basePath: BASE_PATH
    });

    loop(downloader);
    setInterval(() => loop(downloader), 1000 * 60 * CHECK_ZOTERO_INTERVAL_MINUTES);
};

main();