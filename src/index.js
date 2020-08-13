import dlManga from './mdDL.js'
import IpfsClient from 'ipfs-http-client'
import OrbitDB from 'orbit-db'
import {readFile, opendir} from 'fs/promises'

// For js-ipfs >= 0.38

// Create IPFS instance
const ipfs = IpfsClient()


let orbitInit = async () => {
  const orbitdb = await OrbitDB.createInstance(ipfs);

  // Create / Open a database
  const db = await orbitdb.log("hello");
  await db.load();
}

let addFolder = async (filePath, ipfsPath) => {
    const dir = await opendir(filePath)
    for await (const dirent of dir) {
        let file = await readFile(filePath + `/${dirent.name}`)
        await ipfs.files.write(ipfsPath + `/${dirent.name}`, file, {rawLeaves: true, parents: true, create: true})
    }
}

// orbitInit()
addFolder('./manga/14312', '/manga/14312')



let test = async () => {
    const providers = ipfs.dht.findProvs('QmdPAhQRxrDKqkGPvQzBvjYe3kU8kiEEAd2J6ETEamKAD9')

    for await (const provider of providers) {
    console.log(provider.id.toString())
    const info = await ipfs.dht.findPeer(provider.id.toString())

    console.log(info.id)
    }

}

// test()

dlManga(4)