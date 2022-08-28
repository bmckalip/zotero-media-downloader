
const DownloadManager = require('./DownloadManager');
const ManifestManager = require('./ManifestManager');
const {DOWNLOAD_STATUS, DEFAULT_APP_CONFIG} = require('./constants');

module.exports = {
    config: (config=DEFAULT_APP_CONFIG) => {
        process.env = {...process.env, ...config}
    },
    run: async () => {
        const { CHECK_ZOTERO_INTERVAL_MINUTES, DRYRUN }  = process.env;
        await DownloadManager.buildManifest();
        DRYRUN && console.log(`[DRYRUN] no videos will be downloaded and the manifest will not be changed. The Zotero API will still be accessed.`)
        setInterval(DownloadManager.updateDownloadQueue, CHECK_ZOTERO_INTERVAL_MINUTES * 60 * 1000);
        DownloadManager.updateDownloadQueue();
        await DownloadManager.downloadAll();
    },
    DownloadManager, ManifestManager, DOWNLOAD_STATUS, DEFAULT_APP_CONFIG
};