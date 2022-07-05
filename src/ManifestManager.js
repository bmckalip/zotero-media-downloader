const fs = require('fs/promises');
const path = require('path');

module.exports = class ManifestManager {
    static manifest;
    static DEFAULT_MANIFEST = {
        created: new Date().toISOString(),
        videos: []
    }

    static loadManifest = async () => {
        if(!ManifestManager.manifest){
            try {
                //load an existing manifest
                const manifestLocation = path.join(process.env.BASE_PATH, 'manifest.json');
                const rawData = await fs.readFile(manifestLocation);
                ManifestManager.manifest = JSON.parse(rawData);
            } catch(e) {
                //create a default manifest and save it to file immediately
                console.log(`[Building New Manifest]`);
                ManifestManager.manifest = ManifestManager.DEFAULT_MANIFEST;
                await ManifestManager.saveManifest(process.env.BASE_PATH);
            }
        }
        console.log(`[Loading Manifest] Loaded ${ManifestManager.manifest.videos.length} existing videos.`)
    }

    static saveManifest = async () => {
        await fs.writeFile(
            path.join(
                process.env.BASE_PATH, 
                'manifest.json'
            ), 
            JSON.stringify(ManifestManager.manifest, null, 4)
        );
    }

    static addToManifest = obj => {
        ManifestManager.manifest.videos.push(obj);
    }
}