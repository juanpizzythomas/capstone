// faceService.js
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// patch environment agar face-api bisa pakai canvas & image di Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// opsional, import tensorflow-node agar lebih cepat
require('@tensorflow/tfjs');

// load model dari disk
async function loadModels() {
  const modelPath = path.join(__dirname, 'models');  // folder weight
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  console.log('✅ Face-api.js models loaded');
  // load model lain jika perlu
}

// fungsi encodeFace: menerima base64 image, mengubah ke buffer, deteksi wajah & descriptor
async function encodeFace(imageBase64) {
  // bersihkan prefix kalau ada data:image/…
  const matches = imageBase64.match(/^data:image\/\w+;base64,(.+)$/);
  const base64Data = matches ? matches[1] : imageBase64;
  const buffer = Buffer.from(base64Data, 'base64');
  const img = await canvas.loadImage(buffer);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (!detection) return null;
  return detection.descriptor;  // ini array descriptor
}

// fungsi compare descriptor
function compareFaces(descriptor1, descriptor2) {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  const match = distance < 0.6;  // threshold bisa kamu atur
  return { match, distance };
}

module.exports = { loadModels, encodeFace, compareFaces };
