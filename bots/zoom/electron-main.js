const { app, BrowserWindow } = require('electron')
const path = require('path')

// Parse CLI args
const args = process.argv.slice(2)
const meetingNumber = args[args.indexOf('--meeting-number') + 1]
const passcode = args[args.indexOf('--passcode') + 1]
const meetingId = args[args.indexOf('--meeting-id') + 1]

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile(path.join(__dirname, 'zoom-renderer.html'))

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('join-meeting', { meetingNumber, passcode, meetingId })
  })
})

app.on('window-all-closed', () => app.quit())
