import * as fs from "fs"

export function getRoomList () {
    const path = "./database/rooms/list.json"
    
    if(!fs.existsSync(path)) {
        const listObject = {
            rooms: [
                "PL 1"
            ]
        }

        fs.writeFileSync(path, JSON.stringify(listObject))
    }
    
    const rawData = fs.readFileSync(path)
    const roomObject = JSON.parse(rawData.toString())

    return roomObject
}

export function registerNewRoom (room: string, username: string) {
    const path = "./database/rooms/list.json"
    const roomPath = `./database/rooms/${room}.json`

    let roomList

    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path)
        roomList = JSON.parse(rawData.toString())
    } else {
        roomList = {
            rooms: Array(0)
        }
    }

    const roomObject = {
        messages: Array(0),
        owner: username
    }

    fs.writeFileSync(roomPath, JSON.stringify(roomObject))

    if (!roomList.rooms.includes(room)) {
        roomList.rooms.push(room)
        fs.writeFileSync(path, JSON.stringify(roomList))
        return true
    } else {
        return false
    }
}

interface userObject {
    username: string,
    password: string,
    id: string,
    room: string,
    dm: string
}

export function deregisterRoom(user: userObject) {
    const path = `./database/rooms/${user.room}.json`
    const listPath = "./database/rooms/list.json"

    const rawData =  fs.readFileSync(path)
    const roomObject = JSON.parse(rawData.toString())

    const rawList = fs.readFileSync(listPath)
    const list = JSON.parse(rawList.toString())

    if (roomObject.owner !== user.username) return 

    if (list.removed == undefined) list.removed = []

    list.removed.push(user.room)

    fs.writeFileSync(path, JSON.stringify(roomObject))
    fs.writeFileSync(listPath, JSON.stringify(list))

    return true
}