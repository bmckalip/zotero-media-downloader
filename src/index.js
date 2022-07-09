const loadEnv = require('./envLoader');
const DownloadManager = require('./DownloadManager');

const main = () => {
    loadEnv();

    const {
        CHECK_ZOTERO_INTERVAL_MINUTES,
        ZOTERO_VIDEO_COLLECTION_NAME,
        ZOTERO_AUDIO_COLLECTION_NAME,
        VIDEO_FILE_FORMAT,
        AUDIO_FILE_FORMAT,
        DRYRUN
    }  = process.env;
    
    DownloadManager.buildManifest();

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

main();