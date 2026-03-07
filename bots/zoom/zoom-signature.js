const crypto = require('crypto')

function generateZoomSignature(meetingNumber, role = 0) {
  // role 0 = attendee (bot), role 1 = host
  const sdkKey = process.env.ZOOM_SDK_KEY
  const sdkSecret = process.env.ZOOM_SDK_SECRET
  const iat = Math.round(new Date().getTime() / 1000) - 30
  const exp = iat + 60 * 60 * 2

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sdkKey, mn: meetingNumber, role, iat, exp, tokenExp: exp
  })).toString('base64url')
  const sig = crypto.createHmac('sha256', sdkSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${sig}`
}

module.exports = { generateZoomSignature }
