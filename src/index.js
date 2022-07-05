const loadEnv = require('./envLoader');
const DownloadManager = require('./DownloadManager');

const main = () => {
    loadEnv();
    DownloadManager.buildManifest();
    const loop = () => DownloadManager.downloadFromUrls(DownloadManager.DOWNLOADERS.YOUTUBE);
    setInterval(loop, process.env.CHECK_ZOTERO_INTERVAL_MINUTES * 60 * 1000);
    loop();
};

main();