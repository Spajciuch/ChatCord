export interface messageObj {
    message: {
        username: string,
        text: string,
        time: string,
        id: number,
        removed: boolean
    },
    room: string
}

export interface userObject {
    username: string,
    password: string,
    id: string,
    room: string,
    dm: string
}

export interface SessionData {
    user: { username: string, password: string, id: string, room: string, dm: string, avatar: string };
}