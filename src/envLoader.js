const DEFAULT_ENV = {
    ZOTERO_API_KEY: "",
    ZOTERO_USER_ID: "",
    ZOTERO_VIDEO_COLLECTION_NAME:"zdl_video",
    YT_USER_COOKIE:"",
    VIDEO_FILE_FORMAT:"mp4",
    AUDIO_FILE_FORMAT:"mp3",
    BASE_PATH:"/",
    DEBUG: false,
    DRYRUN: false,
    CHECK_ZOTERO_INTERVAL_MINUTES: 5,
    CHANNEL_DOWNLOAD_MAX_DEPTH: -1,
    DOWNLOAD_BATCH_SIZE: 5
} 

module.exports = () => {
    const dotenv = require('dotenv');
    const parseDotEnv = require('dotenv-parse-variables');
    let env = dotenv.config({});
    if (env.error) throw env.error;
    process.env = {...process.env, ...DEFAULT_ENV, ...parseDotEnv(env.parsed)};
}