
const axios = require('axios').default;

module.exports = async ({ZOTERO_API_KEY, ZOTERO_COLLECTION_NAME, ZOTERO_USER_ID}) => {
    try {
        const collections_url = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections`;
        const collections = await axios.get(collections_url, {headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
        const {key} = collections.data.find(({data}) => data.name == ZOTERO_COLLECTION_NAME);
        if(key){
            const items_url = `https://api.zotero.org/users/${ZOTERO_USER_ID}/collections/${key}/items`;
            const items = await axios.get(items_url, {headers: {'Zotero-API-Key': ZOTERO_API_KEY}});
            const urls = items.data.map(({data}) => data.url);
            return urls;
        }
    } catch(e) {
        console.log(e);
    }
}