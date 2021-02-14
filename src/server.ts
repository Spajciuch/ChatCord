import * as dotenv from "dotenv"
dotenv.config()

import * as express from "express"
import * as http from "http"
import * as bodyParser from "body-parser"
import * as socketio from "socket.io"
import * as session from "express-session"
import * as ejs from "ejs"
import * as path from "path"
import * as fileUpload from "express-fileupload"

import * as fs from "fs"

import { userJoin, getUserByName, getRoomUsers, getCurrentUser, userLeave } from "./utils/users"
import { getRoomList, registerNewRoom, deregisterRoom, registerNewAvatar } from "./utils/tools"
import { formatMessage, formatDmMessage, removeMessage } from "./utils/messages"

const app = express()
const server = http.createServer(app)
const io = socketio(server)
app.engine("html", ejs.renderFile)

const renderEJS = (res: express.Response, req: express.Request, file: string, data = {}, status = 200) => {
    res.status(status).render(path.resolve(file), Object.assign(data))
}

const sessionMiddleware = session({
    secret: process.env.PORT,
    resave: true,
    saveUninitialized: true
})

declare module 'express-session' {
    interface SessionData {
        user: { username: string, password: string, id: string, room: string, dm: string, avatar: string };
    }
}


app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }
}))

app.use(bodyParser.urlencoded({ extended: true }))

app.use(sessionMiddleware)
app.use(express.static("./public"))

process.on('unhandledRejection', error => {
    console.log(error)
})

app.get("/", (req, res) => {
    renderEJS(res, req, "./public/index.ejs", { success: true })
})

app.post("/", (req, res) => {
    if (req.body.username) {
        const username = req.body.username

        const path = `./database/users/${username.toLowerCase()}.json`
        if (!fs.existsSync(path)) return renderEJS(res, req, "./public/index.ejs", { success: false })

        const rawData = fs.readFileSync(path)
        const userData = JSON.parse(rawData.toString())

        if (userData.password !== req.body.password) renderEJS(res, req, "./public/index.ejs", { success: false })
        else {
            req.session.user = getUserByName(userData.username)

            const room = userData.room || "PL 1"

            res.redirect(`/chat/${room}`)
        }
    }
})

app.get("/dm/:username", (req, res) => {
    const number = Math.random()

    const author = req.session.user.username
    const receiver = req.params.username

    const path = `./database/dm/permissions/${author.toLowerCase()}.json`
    const receiverPath = `./database/dm/permissions/${receiver.toLowerCase()}.json`

    let dmUsername = req.params.username

    let dmID

    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path)
        const permissions = JSON.parse(rawData.toString())

        if (permissions[dmUsername.toLowerCase()] !== undefined) {
            dmID = permissions[dmUsername.toLowerCase()]
        } else {
            permissions[dmUsername.toLowerCase()] = number.toString(30)

            fs.writeFileSync(path, JSON.stringify(permissions))

            dmID = number.toString(30)
        }

    } else {
        const data = `{"${dmUsername.toLowerCase()}": "${number.toString(30)}"}`

        fs.writeFileSync(path, data)
        dmID = number.toString(30)
    }

    if (fs.existsSync(receiverPath)) {
        const rawData = fs.readFileSync(receiverPath)
        const permissions = JSON.parse(rawData.toString())

        if (permissions[author.toLowerCase()] == undefined) {
            permissions[author.toLowerCase()] = number.toString(30)

            fs.writeFileSync(receiverPath, JSON.stringify(permissions))
        }
    } else {
        const data = `{"${author.toLowerCase()}": "${number.toString(30)}"}`

        fs.writeFileSync(receiverPath, data)
    }

    req.session.user.dm = dmID
    renderEJS(res, req, "./public/dm.ejs", { username: req.params.username, dmID: dmID, author: author })
})

app.get("/chat/:room", (req, res) => {
    if (!req.session.user) return res.redirect("/")
    const user = req.session.user

    const rooms = getRoomList()

    if (!rooms.rooms.includes(req.params.room) && req.params.room !== "PL 1" || rooms.removed.includes(req.params.room)) return res.redirect("/chat/PL 1")
    else if (req.params.room == "PL 1" && !rooms.rooms.includes(req.params.room)) {
        registerNewRoom("PL 1", user.username)
    }

    if (!req.session.user) return res.redirect("/")

    req.session.user.room = req.params.room

    const roomPath = `./database/rooms/${req.params.room}.json`
    const rawRoomData = fs.readFileSync(roomPath)
    const roomData = JSON.parse(rawRoomData.toString())

    renderEJS(res, req, "./public/chat.ejs", { username: user.username, room: req.params.room, list: getRoomList(), owner: roomData.owner })

    const path = `./database/users/${user.username.toLowerCase()}.json`

    const rawData = fs.readFileSync(path)
    let userConfig = JSON.parse(rawData.toString())

    userConfig.room = req.params.room

    fs.writeFileSync(path, JSON.stringify(userConfig))
})

app.get("/register", (req, res) => {
    renderEJS(res, req, "./public/register.ejs", { message: "correct" })
})

app.post("/register", (req, res) => {
    if (req.body.password !== req.body.repeat) return renderEJS(res, req, "./public/register.ejs", { message: "password" })

    const username = req.body.username
    const path = `./database/users/${username.toLowerCase()}.json`

    if (fs.existsSync(path)) return renderEJS(res, req, "./public/register.ejs", { message: "username" })

    const number = Math.random()

    const userObj = {
        username: req.body.username,
        password: req.body.password,
        id: number.toString(36)
    }

    const data = JSON.stringify(userObj)
    fs.writeFileSync(path, data)

    res.redirect("/")
})

app.get("/create", (req, res) => {
    renderEJS(res, req, "./public/create.ejs", { success: true })
})

app.post("/create", (req, res) => {
    const creationStatus = registerNewRoom(req.body.name, req.session.user.username)
    if (creationStatus == true) {
        res.redirect(`/chat/${req.body.name}`)
    } else renderEJS(res, req, "./public/create.ejs", { success: false })
})

app.get("/avatar", (req, res) => {
    renderEJS(res, req, "./public/avatar.ejs", { success: true })
})

app.post("/avatar", (req, res) => {
    if (!req.files || Object.keys(req.files).length == 0) return renderEJS(res, req, "./public/avatar.ejs", { success: false })

    const image = req.files.image as fileUpload.UploadedFile

    registerNewAvatar(req.session.user, image)

    res.redirect(`/chat/${req.session.user.room}`)
})

app.get("/avatars/:username", (req, res) => {
    const user = getUserByName(req.params.username)
    
    let path = __dirname + user.avatar

    if(fs.existsSync(path.replace("dist/", ""))) res.sendFile(path.replace("dist/", ""))
    else res.sendFile((__dirname + "/database/images/avatars/user.png").replace("dist/", ""))
})

app.get("/call", (req, res) => {
    renderEJS(res, req, "./public/call.ejs")
})

const botName = "ChatCord Bot"

io.use(function (socket, next) {
    sessionMiddleware(socket.request, socket.request.res || {}, next)
});

io.on("connection", socket => {
    socket.on("removeRoom", () => {
        const user = socket.request.session.user

        if (deregisterRoom(user)) {
            io.to(user.room).emit("REDIRECT", "/chat/PL 1")
        }
    })

    socket.on("joinRoom", async () => {
        if (!socket.request.session.user) return

        console.log(`[socket.io] ${socket.request.session.user.username} connected to ${socket.request.session.user.room}`)

        const user = socket.request.session.user
        if (!user) return

        userJoin(user.username, user.room, socket.id)

        socket.join(user.room)

        socket.broadcast.to(user.room).emit("message", formatMessage(botName, `${user.username} - welcome to the creampie gulag zone`, user.room))

        const path = `./database/rooms/${user.room}.json`

        if (fs.existsSync(path)) {
            const rawData = await fs.readFileSync(path)
            const channelObj = JSON.parse(rawData.toString())

            socket.emit("oldMessages", channelObj)
        }

        socket.request.sessionStore.all((err: any, sessions: any) => {
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        })
    })

    socket.on("joinDM", async () => {
        console.log(`[socket.io] ${socket.request.session.user.username} connected to ${socket.request.session.user.dm}`)
        const user = socket.request.session.user

        const path = `./database/dm/${user.dm}.json`

        socket.join(user.dm)

        if (fs.existsSync(path)) {
            const rawData = await fs.readFileSync(path)
            const channelObj = JSON.parse(rawData.toString())

            socket.emit("oldMessages", channelObj)
        }
    })

    socket.on("directMessage", async msg => {
        const user = socket.request.session.user
        if (!user) return socket.emit("redirect", "/")

        const msgObject = formatDmMessage(user.username, msg, user.dm)
        io.to(user.dm).emit("dMessage", msgObject)

        const path = `./database/dm/${user.dm}.json`

        if (!fs.existsSync(path)) await fs.writeFileSync(path, '{"messages": []}')

        const rawData = fs.readFileSync(path)
        const roomMessages = JSON.parse(rawData.toString())

        roomMessages.messages.push(msgObject)
        await fs.writeFileSync(path, JSON.stringify(roomMessages))

        const socketUser = getCurrentUser(user.name)

        if (socketUser) {
            const socketID = socketUser.id

            io.to(socketID).emit("private", `You have got a direct message from ${user.username}!`)
        }
    })

    socket.on("chatMessage", async msg => {
        const user = socket.request.session.user
        if (!user) return socket.emit("redirect", "/")

        const msgObject = formatMessage(user.username, msg, user.room)

        io.to(user.room).emit("message", msgObject)

        const path = `./database/rooms/${user.room}.json`

        if (!fs.existsSync(path)) await fs.writeFileSync(path, '{"messages": []}')

        const rawData = fs.readFileSync(path)
        const roomMessages = JSON.parse(rawData.toString())

        roomMessages.messages.push(msgObject)
        await fs.writeFileSync(path, JSON.stringify(roomMessages))
    })

    socket.on("removeMessage", messageObject => {
        const user = socket.request.session.user

        removeMessage(messageObject, user)

        const message = messageObject.message
        io.to(user.room).emit("removed", message.id)
    })

    socket.on("removeDmMessage", message => {
        const user = socket.request.session.user

        if (message.username !== user.username) return

        const path = `./database/dm/${user.dm}.json`

        const rawData = fs.readFileSync(path)
        const dmObject = JSON.parse(rawData.toString())

        const msg = dmObject.messages.find((msg: { id: number }) => msg.id == message.id)

        dmObject.messages[message.id] = {
            username: msg.username,
            text: msg.text,
            time: msg.time,
            id: msg.id,
            removed: true
        }
        fs.writeFileSync(path, JSON.stringify(dmObject))

        io.to(user.dm).emit("removed", message.id)
    })

    socket.on("disconnect", () => {
        const user = socket.request.session.user

        if (user) {
            userLeave(user.username)

            io.to(user.room).emit("message", formatMessage(botName, `${user.username} has left the chat`, user.room))

            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    })
})


app.use(function (req, res, next) {
    res.status(404);
    renderEJS(res, req, "./public/404.ejs")
})

const PORT = process.env.PORT || 80

server.listen(PORT, () => console.log(`Server is running on port: ${PORT}`))