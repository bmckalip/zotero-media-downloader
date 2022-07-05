const DEFAULT_ENV = {
    ZOTERO_API_KEY: "",
    ZOTERO_USER_ID: "",
    ZOTERO_COLLECTION_NAME:"zdl",
    YT_USER_COOKIE:"",
    FILE_FORMAT:"mp4",
    BASE_PATH:"/",
    SUB_DIRECTORY:"/",
    DEBUG: false,
    CHECK_ZOTERO_INTERVAL_MINUTES: 5
} 

module.exports = () => {
    const dotenv = require('dotenv');
    const parseDotEnv = require('dotenv-parse-variables');
    let env = dotenv.config({});
    if (env.error) throw env.error;
    process.env = {...process.env, ...DEFAULT_ENV, ...parseDotEnv(env.parsed)};
}