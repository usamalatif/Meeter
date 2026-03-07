const { spawn } = require('child_process')

async function launchZoomBot(meetingNumber, passcode, meetingId) {
  // Start virtual display (Zoom SDK needs a display on Linux)
  const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1024x768x24'])
  process.env.DISPLAY = ':99'

  await new Promise(r => setTimeout(r, 1000)) // wait for Xvfb

  const botProcess = spawn('electron', [
    './bots/zoom/electron-main.js',
    '--meeting-number', meetingNumber,
    '--passcode', passcode,
    '--meeting-id', meetingId
  ], {
    env: { ...process.env, DISPLAY: ':99' },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  botProcess.stdout.on('data', d => console.log('[ZoomBot]', d.toString()))
  botProcess.stderr.on('data', d => console.error('[ZoomBot:err]', d.toString()))
  botProcess.on('exit', (code) => {
    console.log(`[ZoomBot] Process exited with code ${code}`)
    xvfb.kill()
  })

  return botProcess
}

module.exports = { launchZoomBot }
