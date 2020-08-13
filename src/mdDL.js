import fetch from 'node-fetch';
import {mkdir, writeFile} from 'fs/promises'
import {createHmac} from 'crypto'
import ipfsClient from 'ipfs-http-client'
import util from 'util'
import path from 'path'
const __dirname = path.resolve();
const multihash = ipfsClient.multihash 

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


export default async function dlManga(manga_id, options={}, tld='org') {
    let mangaInfo

    try{
        let res = await fetch(`https://mangadex.${tld}/api/manga/${manga_id}/`)
        if(!res.ok) throw 'shit fucked:\n' + res
        mangaInfo = await res.json()
    }
    catch (e) {
        console.error(e)
        return;
    }
    
    // console.log(mangaInfo.manga.title)

    let chapters = mangaInfo.chapter
    if(!!options.lang_code) chapters = chapters.filter(ch => ch.lang_code === lang_code)

    for(const chapter_id in chapters){
        await dlChapter(chapter_id)
        // console.log(chapter_id, chapters[chapter_id]))
        await wait(2000)
    }
    //TODO: return a Promise.all
}


export async function dlChapter(chapter_id, tld="org"){
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

    let {
        id, 
        manga_id,
        chapter,
        title,
        volume,
        timestamp,  
        lang_code, 
        group_name,
        group_name_2,
        group_name_3
    } = await chapterInfo

    let groups = []
    if(group_name) {groups.push(group_name)}
    if(group_name_2) {groups.push(group_name_2)}
    if(group_name_3) {groups.push(group_name_3)}

    let saveInfo = {
        source: 'mangadex',
        mangadex_info:{
            chapter_id: id,
            manga_id,
        },
        title,
        volume,
        chapter,
        timestamp,  
        lang_code, 
        groups,
        page_multihashes: []
    }
    
    
    // console.log( JSON.stringify(chapterInfo), '\n=============\n', JSON.stringify(saveInfo))
    
    let pages = chapterInfo.page_array
    let chapterHost = chapterInfo.server + chapterInfo.hash
    if(!pages) console.warn('no pages')

    // console.log(chapterHost, pages)
    // dlPage(chapterHost+pages[0], `${__dirname}/manga/${chapterInfo.id}`, pages[0]).catch((error) => {console.log('shit', error)})

    let savePath = `${__dirname}/manga/${chapterInfo.id}`
    await mkdir(savePath, { recursive: true }); 

    let downloads = pages.map(page_id => {
        return dlPage(chapterHost+'/'+page_id, savePath, page_id)
        .then((page)=>{
            let pageHash
            if(page_id.includes('-')){
                pageHash = '1220'+page_id.split('-')[1]
                //https://multiformats.io/multihash/#sha2-256-256-bits-aka-sha256
                // 0x12: sha2-256
                // 0x20: 32 bytes long
                multihash.validate(Buffer.from(pageHash))

                saveInfo.page_multihashes.push(pageHash)
            } else {
                let digest = createHmac('sha256', page).digest()
                let pageMultihash = multihash.encode(digest, 'sha2-256')
                let pageHash = multihash.toHexString(pageMultihash)
                multihash.validate(pageMultihash)
                // console.log(pageHash)
                saveInfo.page_multihashes.push(pageHash)
            }
            return pageHash
            // console.log(pageHash)
        })
        .catch((e) => console.log(e))
    });

    await Promise.all(downloads).catch(e => console.log(e))
    writeFile(savePath + '/info.json', JSON.stringify(saveInfo, null, 2))
    // console.log(saveInfo.page_multihashes)
    if(saveInfo.page_multihashes.length !== chapterInfo.page_array.length) throw new Error('the amount of pages hashed and the ones avaliable do not match!')
    
    console.log('[ DONE ]\n', {id:chapterInfo.id, title:chapterInfo.title, chapterHost, savePath})
    return savePath
}

export async function dlPage(url, savePath, page_id){
    const response = await fetch(url);
    const buffer = await response.buffer();
    
	if (response.ok) {
        let pageNum = parseInt(page_id)
        await writeFile(savePath + '/' +  parseInt(page_id.replace(/\D+/g, '')) + path.extname(page_id), buffer)
        return buffer
	}

	throw new Error(`unexpected response:\n\t ${response.statusText} url: ${url}`);
}

async function dls (start, end){
    for (let index = start; index < end; index++) {
        await dlChapter(index)
        .then(() => {return wait(2000)})
        .catch((e) => console.log(e))
    }
}

// dlManga(4, {})

// dls(455, 456)
