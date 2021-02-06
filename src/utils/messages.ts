import * as fs from "fs"
import * as moment from "moment"

export function formatMessage(username: string, text: string, room: string) {
    const path = `./database/rooms/${room}.json`

    let id

    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path)
        const channelObj = JSON.parse(rawData.toString())


        const lastMessage = channelObj.messages[channelObj.messages.length - 1]

        if (lastMessage) id = lastMessage.id + 1 || 0
        else id = 0
    } else {
        id = 0
    }

    return {
        username: username,
        text: text,
        time: moment().format("hh:mm"),
        id: id
    }
}

export function formatDmMessage(username: string, text: string, room: string) {
    const path = `./database/dm/${room}.json`

    let id

    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path)
        const channelObj = JSON.parse(rawData.toString())


        const lastMessage = channelObj.messages[channelObj.messages.length - 1]

        id = lastMessage.id + 1 || 0
    } else {
        id = 0
    }

    return {
        username: username,
        text: text,
        time: moment().format("hh:mm"),
        id: id
    }
}

interface messageObj {
    message: {
        username: string,
        text: string,
        time: string,
        id: number,
        removed: boolean
    },
    room: string
}

interface userObject {
    username: string,
    password: string,
    id: string,
    room: string,
    dm: string
}

export function removeMessage(messageObject: messageObj, user: userObject) {
    const message = messageObject.message

    const room = messageObject.room

    const path = `./database/rooms/${room}.json`

    const rawData = fs.readFileSync(path)
    const roomObject = JSON.parse(rawData.toString())

    if (user.username == message.username || user.username) {
        const msg = roomObject.messages.find((msg: { id: number }) => msg.id == message.id)

        roomObject.messages[message.id] = {
            username: msg.username,
            text: msg.text,
            time: msg.time,
            id: msg.id,
            removed: true
        }
    }
    fs.writeFileSync(path, JSON.stringify(roomObject))
}