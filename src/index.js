const loadEnv = require('./envLoader');
const DownloadManager = require('./DownloadManager');

const main = async () => {
    loadEnv();

    const {
        CHECK_ZOTERO_INTERVAL_MINUTES,
        ZOTERO_VIDEO_COLLECTION_NAME,
        ZOTERO_AUDIO_COLLECTION_NAME,
        VIDEO_FILE_FORMAT,
        AUDIO_FILE_FORMAT,
        DRYRUN
    }  = process.env;
    
    await DownloadManager.buildManifest();

    const loop = () => {
        if(ZOTERO_VIDEO_COLLECTION_NAME){
            DownloadManager.downloadCollection(
                DownloadManager.DOWNLOADERS.YOUTUBE, 
                ZOTERO_VIDEO_COLLECTION_NAME,
                {fileFormat: VIDEO_FILE_FORMAT}
            );
        }

        if(ZOTERO_AUDIO_COLLECTION_NAME){
            DownloadManager.downloadCollection(
                DownloadManager.DOWNLOADERS.YOUTUBE, 
                ZOTERO_AUDIO_COLLECTION_NAME,
                {fileFormat: AUDIO_FILE_FORMAT, downloadVideoStream: false}
            );
        }
    }
    DRYRUN && console.log(`[DRYRUN] no videos will be downloaded and the manifest will not be changed. The Zotero API will still be accessed.`)
    setInterval(loop, CHECK_ZOTERO_INTERVAL_MINUTES * 60 * 1000);
    loop();
};

// main();
const test = async () => {
    const video = "https://www.youtube.com/watch?v=MzGIcxIn5Po";
    const channel = "https://www.youtube.com/c/KRAZAM/videos";
    const playlist  = "https://www.youtube.com/watch?v=kHW58D-_O64&list=PLd9OQYMlUR9PBDXrv_sYOZrznSbVtZg-6";

    // console.log(new URL(video));
    console.log(new URL(channel));
    console.log(new URL(channel).pathname);
    const pn = new URL(channel).pathname;
    const channelName = new URL(channel)?.pathname?.split("/c/")[1]?.split("/")[0];
    console.log(channelName);
    // console.log(new URL(playlist).searchParams.get('list'));
}

// test();
main();
