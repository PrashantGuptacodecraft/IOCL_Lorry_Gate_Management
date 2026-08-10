const fs = require('fs');
const Jimp = require('jimp');
const jsQR = require('jsqr');

async function run() {
  try {
    const buffer = fs.readFileSync('C:\\Users\\prashant gupta\\.gemini\\antigravity\\brain\\f45073e1-ca9d-4145-80a8-fc6d6036a30c\\.user_uploaded\\media_1786348985705.png');
    const image = await Jimp.read(buffer);
    const value = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
    if (value) {
      console.log('QR Code Data:', value.data);
    } else {
      console.log('Could not read QR code.');
    }
  } catch (err) {
    console.error(err);
  }
}
run();
