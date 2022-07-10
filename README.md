# Zotero Media Downloader

**A NodeJS based media downloader capable of saving 4k videos from your Zotero collection to your local computer or network storage location.**

This application uses ytdl-core, FFMPEG-static and the axios to interact with the [Zotero Public API](https://www.zotero.org/support/dev/web_api/v3/start) Note: You do not need to install a 3rd party version of FFMPEG to use this app.

this application automatically creates and manages a `manifest.json` file to track which videos have been downloaded already. If a video's unique video ID is in the manifest, it will not be redownloaded even if it is present in the specified zotero collection, and even if the video is not in the destination directory. You can manually edit the `manifest.json` file if you need to redownload a video (e.g. if you deleted the downloaded file accidentally)

## Installation

1. Clone the repo. Use the latest version of node if possible.
2. Create a `.env` file in the root of the project and configure it as described in the environment variables section below. 
3. run `npm install`

## Usage

1. In the Zotero Desktop or Web App, create a new `collection` that matches the value you have specified in the `ZOTERO_VIDEO_COLLECTION_NAME` environment variable in your `.env` file. e.g. `zytdl`. You can also specify `ZOTERO_AUDIO_COLLECTION_NAME` in the same way.
3. run `npm run start` to launch `zotero-media-downloader`.
4. While Zotero Desktop and `zotero-media-downloader` are running, use the Zotero Connector browser plugin to add urls to the specified collection.
5. Monitor the console and your specified output directory for newly downloaded videos.  

### Environment Variables

#### Required
```dosini
ZOTERO_API_KEY=<your api key>
ZOTERO_USER_ID=<your user id>
```

To find your `API key` and `userID` for zotero, login to your zotero web account and navigate to https://www.zotero.org/settings/keys 

1. On this page look for `"Your userID for use in API calls is <YOUR_USER_ID>"` and copy your user id to your `.env` file
2. Create a new `API key` by clicking on `Create new private key`. Once named and configured (Defaults should be fine), click `Save Key` and copy the string to your `.env` file.
3. create a collection in zotero to be monitored for videos. Only videos in this collection will be downoaded. 

#### Optional
```dosini
ZOTERO_VIDEO_COLLECTION_NAME=zytdlVideo
ZOTERO_AUDIO_COLLECTION_NAME=zytdlAudio
VIDEO_FILE_FORMAT=mkv
AUDIO_FILE_FORMAT=flac
BASE_PATH=C:/path/to/download/location
CHECK_ZOTERO_INTERVAL_MINUTES=30
YT_USER_COOKIE=<value from browser>
DEBUG=true
DRYRUN=true
```

* `ZOTERO_VIDEO_COLLECTION_NAME` zdl_video
* `ZOTERO_AUDIO_COLLECTION_NAME` zdl_audio
* `VIDEO_FILE_FORMAT` defaults to mp4
* `AUDIO_FILE_FORMAT` defaults to mp3
* `CHECK_ZOTERO_INTERVAL_MINUTES` How often to check the zotero API for new videos to download. Defaults to 5 minutes
* `YT_USER_COOKIE` is required to download some age-restricted videos. Without specifying this value, you will be unable to download many videos, and will see errors in the console. For best results, you should specify this variable with the full cookie value from a youtube network request in your browser.

    - open chrome
    - navigate to youtube and login to your (age-unrestricted) account.
    - press `f12` or right click the page, and select `inspect element`
    - select the `network` tab in chrome dev tools
    - navigate to any youtube video in your browser
    - in the chrome dev tools filter box, search for `heartbeat`, select  it in the list. (many requests will have this value, heatbeat is just an example)
    - Expand/Scroll to the `Request Headers` section on the right. 
    - copy the full `cookie` request header value and paste it in your `.env` file
    - ![Cookie Value Location](./res/cookie-screenshot.png)

## Roadmap

- [x] Release working downloader service
- [x] add filetype options for audio (mp3)
- [x] add youtube channel downloading support
- [ ] add youtube playlist downloading support
- [ ] add quality options
- [ ] improve folder stucture and zotero collection structure to use nesting for better organization
- [ ] add other services besides youtube
- [ ] multithreading and batching

## Changelog
- [x] 1.0.0 release. Connects Zotero API to the downloader service. Limited customizability
- [x] 1.1.0 release. Added support for Audio file downloading
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
- [x] 1.1.1 release. Added support for channel downloading