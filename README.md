# Zotero Youtube Downloader

**A NodeJS based Youtube downloader capable of saving 4k videos from your Zotero collection to your local computer or network storage location.**

This application uses ytdl-core, FFMPEG-static and the axios to interact with the [Zotero Public API](https://www.zotero.org/support/dev/web_api/v3/start) Note: You do not need to install a 3rd party version of FFMPEG to use this app.

this application automatically creates and manages a `manifest.json` file to track which videos have been downloaded already. If a video's unique video ID is in the manifest, it will not be redownloaded even if it is present in the specified zotero collection, and even if the video is not in the destination directory. You can manually edit the `manifest.json` file if you need to redownload a video (e.g. if you deleted the downloaded file accidentally)

## Installation

1. Clone the repo. Use the latest version of node if possible.
2. Create a `.env` file in the root of the project and configure it as described in the environment variables section below. 
3. run `npm install`

## Usage

1. In the Zotero Desktop or Web App, create a new `collection` that matches the value you have specified in the `ZOTERO_COLLECTION_NAME` environment variable in your `.env` file. e.g. `zytdl`.
3. run `npm run start` to launch `zotero-youtube-downloader`.
4. While Zotero Desktop and `zotero-youtube-downloader` are running, use the Zotero Connector browser plugin to add youtube links to the specified collection.
5. Monitor the console and your specified output directory for newly downloaded videos.  

### Environment Variables

#### Required
```dosini
ZOTERO_API_KEY=<your api key>
ZOTERO_USER_ID=<your user id>
ZOTERO_COLLECTION_NAME=zytdl
```

To find your `API key` and `userID` for zotero, login to your zotero web account and navigate to https://www.zotero.org/settings/keys 

1. On this page look for `"Your userID for use in API calls is <YOUR_USER_ID>"` and copy your user id to your `.env` file
2. Create a new `API key` by clicking on `Create new private key`. Once named and configured (Defaults should be fine), click `Save Key` and copy the string to your `.env` file.
3. create a collection in zotero to be monitored for youtube videos. Only youtube videos in this collection will be downoaded. 

#### Optional
```dosini
YT_USER_COOKIE=<value from browser>
FILE_FORMAT=mkv
BASE_PATH=C:/path/to/download/location
DEBUG=false
CHECK_ZOTERO_INTERVAL_MINUTES=2
SAVE_MANIFEST_INTERVAL_MINUTES=1
```

* `FILE_FORMAT` defaults to mp4
* `CHECK_ZOTERO_INTERVAL_MINUTES` How often to check the zotero API for new videos to download. Defaults to 5 minutes
* `SAVE_MANIFEST_INTERVAL_MINUTES` How often to save the manifest file of downloaded videos. Defaults to 3 minutes
* `YT_USER_COOKIE` is required to download some age-restricted videos. Without specifying this value, you will be unable to download many videos, and will see errors in the console. For best results, you should specify this variable with the full cookie value from a youtube network request in your browser.

    1. open chrome
    2. navigate to youtube and login to your (age-unrestricted) account.
    3. press `f12` or right click the page, and select `inspect element`
    4. select the `network` tab in chrome dev tools
    5. navigate to any youtube video in your browser
    6. in the chrome dev tools filter box, search for `heartbeat`, select  it in the list. (many requests will have this value, heatbeat is just an example)
    7. Expand/Scroll to the `Request Headers` section on the right. 
    8. copy the full `cookie` request header value and paste it in your `.env` file
        ![Copy Cookie Value](./res/cookie-screenshot.png)