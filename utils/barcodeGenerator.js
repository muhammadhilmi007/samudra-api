// utils/barcodeGenerator.js
const bwipjs = require('bwip-js');

/**
 * Generate barcode for STT
 * @param {string} noSTT - STT number to encode
 * @returns {Promise<string>} Base64 encoded barcode image
 */
exports.generateBarcode = async (noSTT) => {
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',       // Barcode type
      text: noSTT,          // Text to encode
      scale: 3,             // 3x scaling factor
      height: 10,           // Bar height, in millimeters
      includetext: true,    // Show human-readable text
      textxalign: 'center', // Center the text
    });

    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    throw new Error(`Failed to generate barcode: ${error.message}`);
  }
};