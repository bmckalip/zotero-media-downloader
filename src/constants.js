module.exports = {
    DOWNLOAD_STATUS: {
        UNDOWNLOADED: "undownloaded",
        DOWNLOADING: "downloading",
        DOWNLOADED: "downloaded",
        FAILED: "failed"
    },
    DEFAULT_APP_CONFIG: {
        ZOTERO_API_KEY: "",
        ZOTERO_USER_ID: "",
        ZOTERO_VIDEO_COLLECTION_NAME:"zdl_video",
        YT_USER_COOKIE:"",
        VIDEO_FILE_FORMAT:"mp4",
        AUDIO_FILE_FORMAT:"mp3",
        BASE_PATH:"/",
        DEBUG: false,
        DRYRUN: false,
        LOOP_INTERVAL_MINUTES: 5,
        CHANNEL_DOWNLOAD_MAX_DEPTH: -1,
        DOWNLOAD_BATCH_SIZE: 5,
        PRESERVE_LOG: false
    } 
}