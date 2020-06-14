const fetch = require("node-fetch");
const util = require('util');
const fs = require('fs');
const mkdir = util.promisify(fs.mkdir)
const writeFile = util.promisify(fs.writeFile)

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


async function dlManga(manga_id, options, tld="org") {
    let mangaInfo
    try{
        let res = await fetch(`https://mangadex.${tld}/api/manga/${manga_id}/`)
        if(!res.ok) throw 'shit fucked'
        mangaInfo = await res.json()
    }
    catch (e) {
        console.error(e)
        return;
    }
    
    // console.log(mangaInfo.manga.title)
    
    let chapters = mangaInfo.chapter
    
    for(const chapter_id in chapters){
        await dlChapter(chapter_id)
        // console.log(`${chapter_id}: ${JSON.stringify(chapters[chapter_id])}`)
        await wait(2000)
    }
}

async function dlPage(url, path, page_id){
    const response = await fetch(url);
    const buffer = await response.buffer();
    
	if (response.ok) {
        await mkdir(path, { recursive: true }); 
        return writeFile(path+'/'+page_id, buffer)
	}

	throw new Error(`unexpected response ${response.statusText}`);
}


async function dlChapter(chapter_id, tld="org"){
    console.log('downloading id:', chapter_id)
    let chapterInfo
    try{
        let res = await fetch(`https://mangadex.${tld}/api/chapter/${chapter_id}/`)
        chapterInfo = await res.json()
        if(!res.ok){
            throw chapterInfo.message
        }
    }
    catch (e) {
        if(chapterInfo.message)
            console.warn(chapterInfo.message)
        else console.warn(e)
        return
    }

    // console.log( JSON.stringify(await chapterInfo, null, 2))
    
    
    let pages = chapterInfo.page_array
    let chapterHost = chapterInfo.server + chapterInfo.hash + '/'
    let downloading = []
    if(!pages) console.warn('no pages')
    // console.log(chapterHost, pages)
    // dlPage(chapterHost+pages[0], `${__dirname}/manga/${chapterInfo.id}`, pages[0]).catch((error) => {console.log('shit', error)})

    pages.forEach(async page_id => {
        let page = dlPage(chapterHost+page_id, `${__dirname}/manga/${chapterInfo.id}`, page_id).catch((e) => console.log(e))
        downloading.push(page)
    });


    await Promise.all(downloading)
    console.log('done', chapterInfo.id, chapterInfo.title, chapterHost)
}

// dlManga(1, {})
const dls = async (start, end) =>{
    for (let index = start; index < end; index++) {
        await dlChapter(index)
        .then(() => {return wait(2000)})
        .catch((e) => console.log(e))
    }
}
dls(1, 10)

