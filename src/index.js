
const DownloadManager = require('./DownloadManager');
const ManifestManager = require('./ManifestManager');
const {DOWNLOAD_STATUS, DEFAULT_APP_CONFIG} = require('./constants');

const config = (config=DEFAULT_APP_CONFIG) => {
    process.env = {...process.env, ...config}
}

const loop =  async () => {
    await DownloadManager.updateDownloadQueue();
    await DownloadManager.downloadAll();
}

const start = async () => {
    const { LOOP_INTERVAL_MINUTES, DRYRUN }  = process.env;
    await DownloadManager.buildManifest();
    DRYRUN && console.log(`[DRYRUN] no videos will be downloaded and the manifest will not be changed. The Zotero API will still be accessed.`)
    setInterval(loop, LOOP_INTERVAL_MINUTES * 60 * 1000);
    loop();
}

module.exports = {
    config, loop, start,
    DownloadManager, ManifestManager, DOWNLOAD_STATUS, DEFAULT_APP_CONFIG
}