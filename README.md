# ChatCord

This is simple socket.io chat server.
My project is based on other tutorial by Brad Traversy that you can find [here](https://github.com/bradtraversy/chatcord)

I've added some features like: 
- Accounts
- Custom rooms
- Icon next to the nickname 
- Direct Messages
- Ability to delete messages
- Custom context menu 
- Added EJS 
- Added session support 
- Auto break long text
- Handling 404
- Remember me option
- Switching between themes - dark and light
- Removing messages

## Planned features
- [ ] Voice calls
- [x] Avatar support
- [x] Embeding links

## Download and run
`git clone https://github.com/Spajciuch/chatcord`

`cd chatcord`

`npm install`

Before you'll start using this, you have to build this app 

`tsc`

then run: 

`node dist/server.js`