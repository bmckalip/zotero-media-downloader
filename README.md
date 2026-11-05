# Zotero Media Downloader

**A NodeJS based media downloader capable of saving 4k videos from your Zotero collection to your local computer or network storage location using FFmpeg.**

This application uses ytdl-core, FFMPEG-static and the axios to interact with the [Zotero Public API](https://www.zotero.org/support/dev/web_api/v3/start) Note: You do not need to install a 3rd party version of FFMPEG to use this app.

this application automatically creates and manages a `manifest.json` file to track which videos have been downloaded already. If a video's unique video ID is in the manifest, it will not be redownloaded even if it is present in the specified zotero collection, and even if the video is not in the destination directory. You can manually edit the `manifest.json` file if you need to redownload a video (e.g. if you deleted the downloaded file accidentally)

***

## Status, support and releases

Status checked November 4, 2026. This is a historical standalone Node.js utility. Current end-to-end compatibility with Zotero, YouTube and FFmpeg has not been revalidated, so a successful live download is not currently established.

- The latest published [npm package](https://www.npmjs.com/package/zotero-media-downloader) is **1.3.1**, published March 28, 2023. The repository also declares 1.3.1; there are currently no GitHub releases or tags. The six runtime JavaScript files in the published package match the repository after line-ending normalization. The newer repository README is separate from the published package's older README.
- No supported Node.js version range is declared in `package.json`. An isolated check on **Node.js 22.22.2** passed manifest creation/save/reload, fixture Zotero pagination and URL deduplication, direct YouTube watch-URL extraction, duplicate-queue suppression and dispatch. Collection responses and the media adapter were fixtures, dependency install scripts were disabled, and no live API or FFmpeg media output was tested. This is limited runtime evidence, not an end-to-end compatibility result.
- [Issue #3](https://github.com/bmckalip/zotero-media-downloader/issues/3) remains open for content-restricted videos failing with a miniget 410 error. Playlist extraction is also marked broken in the current source. See open issues and source limitations before relying on the utility.

The usage examples below preserve exported defaults and take credentials from the process environment. Create the configured output directory before starting. The historical roadmap and changelog are retained as development history. A future support/release claim needs representative live downloader verification and dependency/provenance review.

### License provenance

The repository's `package.json` and npm metadata declare **ISC**, while GitHub's repository metadata reports **MIT**. The default branch and published npm archive contain no license text file, and GitHub's license endpoint returns 404. These records are inconsistent; the provenance remains unresolved. Reconcile the original author/source records before adding license terms or preparing a new release. Existing dependency and upstream attribution records remain separate.

## Installation & Configuration

1. in your project, run this command: `npm install zotero-media-downloader`
2. to run zdl as a standalone server, import `config`, `start`, and `DEFAULT_APP_CONFIG` from the package, and use them in the following way:
```js
const { config, start, DEFAULT_APP_CONFIG } = require('zotero-media-downloader');

const main = async () => {
    if (!process.env.ZOTERO_API_KEY || !process.env.ZOTERO_USER_ID) {
        throw new Error('Set ZOTERO_API_KEY and ZOTERO_USER_ID before starting.');
    }

    config({
        ...DEFAULT_APP_CONFIG,
        ZOTERO_API_KEY: process.env.ZOTERO_API_KEY,
        ZOTERO_USER_ID: process.env.ZOTERO_USER_ID,
        BASE_PATH: process.env.ZDL_BASE_PATH || './downloads'
    });
    await start();
};

main().catch(() => {
    console.error('Downloader startup failed.');
    process.exitCode = 1;
});
```

3. In the Zotero Desktop or Web App, create a new `collection` that matches the value you have specified for your `ZOTERO_VIDEO_COLLECTION_NAME` environment variable in your config. e.g. `zytdl`. You can also create and specify `ZOTERO_AUDIO_COLLECTION_NAME` in the same way. See Below for all config properties.
4. While Zotero Desktop and `zotero-media-downloader` server are running, use the Zotero Connector browser plugin to add urls to the specified collection.
5. Monitor the console and your specified output directory for newly downloaded videos.  

***

## Configuration

Treat `ZOTERO_API_KEY`, `ZOTERO_USER_ID`, and `YT_USER_COOKIE` as sensitive configuration. Supply them through your secret manager or protected process environment; keep their values out of source control, screenshots and logs. Pass `...DEFAULT_APP_CONFIG` before your overrides so defaults such as the polling interval remain available. 

| Property Name                    | Data Type | Required | Default Value | Description                                                                                                                                     |
|----------------------------------|-----------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------|  
| ZOTERO_API_KEY                   | String    | yes      | ""            | Your API key from Zotero. See Instructions Below. |
| ZOTERO_USER_ID                   | String    | yes      | ""            | Your User ID from Zotero. See Instructions Below. |
| ZOTERO_VIDEO_COLLECTION_NAME     | String    | no       | "zdl_video"   | The name of the Zotero collection you want to be monitored for video download links. |
| ZOTERO_AUDIO_COLLECTION_NAME     | String    | no       | undefined     | The name of the Zotero collection you want to be monitored for audio download links. |
| YT_USER_COOKIE                   | String    | no       | ""            | Youtube cookie value from your browser. required for certain age restricted videos. See Instructions Below. |
| VIDEO_FILE_FORMAT                | String    | no       | "mp4"         | The format you wish to save videos in. Some options are "mp4", "mkv" |
| AUDIO_FILE_FORMAT                | String    | no       | "mp3"         | The format you wish to save audio in. Some options are "mp3", "flac". |
| BASE_PATH                        | String    | no       | "/"           | Path to the location you wish downoaded content to be saved in. Can be an absolute or relative path. |
| DEBUG                            | Boolean   | no       | false         | Prints additional console information. |
| DRYRUN                           | Boolean   | no       | false         | Will prevent any videos rom actually being downloaded. Zotero API will still be accessed like normal |
| LOOP_INTERVAL_MINUTES            | Number    | no       | 5             | This is the number in minutes that zotero will be polled for new videos in the specified collections |
| CHANNEL_DOWNLOAD_MAX_DEPTH       | Number    | no       | -1            | If channel links are detected in the collection, this value refers to the max number of most recent videos to download from the channel. |
| DOWNLOAD_BATCH_SIZE              | Number   | no       | 5             | The number of videos to download simulaneously. This value should be increased or decreased depending on the speed of your internet connection. |
| PRESERVE_LOG                     | Boolean   | no       | false         | If set to true, prevent the console output from clearing after each loop | 

***

## Advanced Usage

### **How to Find your Zotero API key and User ID**

To find your `API key` and `userID` for zotero, login to your zotero web account and navigate to https://www.zotero.org/settings/keys 

1. On this page look for `"Your userID for use in API calls is <YOUR_USER_ID>"` and copy your user id to your config
2. Create a new `API key` by clicking on `Create new private key`. Once named and configured (Defaults should be fine), click `Save Key` and copy the string to your config.

### **How to find your Youtube cookie value**

1. open chrome
2. navigate to youtube and login to your (age-unrestricted) account.
3. press `f12` or right click the page, and select `inspect element`
4. select the `network` tab in chrome dev tools
5. navigate to any youtube video in your browser
6. in the chrome dev tools filter box, search for `heartbeat`, select  it in the list. (many requests will have this value, heatbeat is just an example)
7. Expand/Scroll to the `Request Headers` section on the right. 
8. copy the full `cookie` request header value and paste it in your config.
9. ![Cookie Value Location](./res/cookie-screenshot.png)

### **Using the DownloadManager class directly**

If you need more control over how and when downloading occurs, you can import the DownloadManager class directly and use it as required. Note: the config function automatically injects your config into process.env

```js
const { config, loop, DownloadManager, DEFAULT_APP_CONFIG } = require('zotero-media-downloader');

const customUsage = async () => {
    if (!process.env.ZOTERO_API_KEY || !process.env.ZOTERO_USER_ID) {
        throw new Error('Set ZOTERO_API_KEY and ZOTERO_USER_ID before starting.');
    }

    config({
        ...DEFAULT_APP_CONFIG,
        ZOTERO_API_KEY: process.env.ZOTERO_API_KEY,
        ZOTERO_USER_ID: process.env.ZOTERO_USER_ID,
        BASE_PATH: process.env.ZDL_BASE_PATH || './downloads'
    });
    const { LOOP_INTERVAL_MINUTES } = process.env;
    await DownloadManager.buildManifest();
    setInterval(loop, Number(LOOP_INTERVAL_MINUTES) * 60 * 1000);
    await loop();
};

customUsage().catch(() => {
    console.error('Downloader startup failed.');
    process.exitCode = 1;
});
```

***

## Roadmap

- [x] Release working downloader service
- [x] add filetype options for audio (mp3)
- [x] add youtube channel downloading support
- [X] download batching
- [x] Distribute `zotero-media-downloader` as an NPM package
- [ ] add quality options
- [ ] investigate if this tool can be turned into a zotero plugin
- [ ] improve folder stucture and zotero collection structure to use nesting for better organization
- [ ] add youtube playlist downloading support
- [ ] add other services besides youtube
- [ ] multithreading, proxies

***

## Changelog
- [x] **1.0.0** Connects Zotero API to the downloader service. Limited customizability
- [x] **1.1.0** Added support for Audio file downloading
    - Added support for downloading audio streams from youtube, and saving them in a configurable audio file format.
    - Added `Dryrun` mode
    - Improved error handling and debugging
    - changed package name from `zotero-youtube-downloader` to `zotero-media-downloader`
    - removed most references to `youtube` in the `README.md` to prepare for adding more downloaders
    - Environment variable changes
        - added `DRYRUN`
        - removed `SUB_DIRECTORY`
        - renamed `ZOTERO_COLLECTION_NAME` to `ZOTERO_VIDEO_COLLECTION_NAME`
        - added `ZOTERO_AUDIO_COLLECTION_NAME`
        - renamed `FILE_FORMAT` to `VIDEO_FILE_FORMAT`
        - added `AUDIO_FILE_FORMAT`
- [x] **1.1.1** Added support for channel downloading
- [x] **1.1.2** 
    - Bugfixes and improvements for channel downloading
        - fixed bug where downloading channels with different YT url structures would not work (now supports /user/ and /channel/)
        - fixed a bug where only the latest 30 videos from a channel would be downloaded. Now all are downloaded.
    - Added envionment variable `CHANNEL_DOWNLOAD_MAX_DEPTH` to limit maximum number videos that can be downloaded from a channel
- [X] **1.1.3** implemented download batching
- [X] **1.2.0** distributed as an NPM package, Changed Usage. Eliminated Environment variables to support new package distribution method.
- [x] **1.2.1** added registry to package.json
- [x] **1.2.2** fixed url in registry package.json
- [x] **1.3.0** BREAKING CHANGE: "run" renamed to "start", improved logging.

***