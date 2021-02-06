import * as fs from "fs" 

const users = Array(0)

export function userJoin(username: string, room: string, id: string) {
    const user = {
        username: username,
        room: room,
        id: id
    }

    users.push(user)
}

export function getUserByName(name: string) {
    const path = `./database/users/${name.toLowerCase()}.json`

    if(fs.existsSync(path)) {
        const rawData = fs.readFileSync(path)
        const userObj = JSON.parse(rawData.toString())

        return userObj
    } else return {username: "Ananymous", password: "---", id: "000", room: "PL 1", dm: "aaa"}
} 

export function getRoomUsers (room: string) {
    return users.filter(user => user.room == room)
}

export function getCurrentUser(name: string) {
    return users.find(user => user.name == name)
}

export function userLeave(username: string) {
    users.splice(users.indexOf(users.find(user => user.username == username)), 1)
}