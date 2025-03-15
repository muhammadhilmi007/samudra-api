const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate STT (Surat Tanda Terima) PDF
 * @param {Object} stt - STT data with populated references
 * @param {WritableStream} stream - Stream to pipe the PDF to
 */
exports.generateSTTPDF = (stt, stream) => {
  // Create a document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Pipe the PDF to the stream
  doc.pipe(stream);
  
  // Add logo and header
  // doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
  doc.fontSize(16).text('SAMUDRA EKSPEDISI', 50, 50);
  doc.fontSize(12).text('Surat Tanda Terima (STT)', 50, 70);
  doc.fontSize(10).text(`Nomor: ${stt.noSTT}`, 50, 90);
  
  // Add barcode
  doc.fontSize(10).text(`Barcode: ${stt.barcode}`, 350, 50);
  
  // Add horizontal line
  doc.moveTo(50, 110).lineTo(550, 110).stroke();
  
  // Add sender and recipient info
  doc.fontSize(12).text('Pengirim:', 50, 130);
  doc.fontSize(10).text(`Nama: ${stt.pengirimId.nama}`, 50, 150);
  doc.fontSize(10).text(`Alamat: ${stt.pengirimId.alamat}`, 50, 170);
  doc.fontSize(10).text(`Telepon: ${stt.pengirimId.telepon}`, 50, 190);
  doc.fontSize(10).text(`Kota: ${stt.pengirimId.kota}`, 50, 210);
  
  doc.fontSize(12).text('Penerima:', 300, 130);
  doc.fontSize(10).text(`Nama: ${stt.penerimaId.nama}`, 300, 150);
  doc.fontSize(10).text(`Alamat: ${stt.penerimaId.alamat}`, 300, 170);
  doc.fontSize(10).text(`Telepon: ${stt.penerimaId.telepon}`, 300, 190);
  doc.fontSize(10).text(`Kota: ${stt.penerimaId.kota}`, 300, 210);
  
  // Add package info
  doc.fontSize(12).text('Informasi Pengiriman:', 50, 240);
  doc.fontSize(10).text(`Cabang Asal: ${stt.cabangAsalId.namaCabang}`, 50, 260);
  doc.fontSize(10).text(`Cabang Tujuan: ${stt.cabangTujuanId.namaCabang}`, 50, 280);
  doc.fontSize(10).text(`Nama Barang: ${stt.namaBarang}`, 50, 300);
  doc.fontSize(10).text(`Komoditi: ${stt.komoditi}`, 50, 320);
  doc.fontSize(10).text(`Packing: ${stt.packing}`, 50, 340);
  doc.fontSize(10).text(`Jumlah Colly: ${stt.jumlahColly}`, 50, 360);
  doc.fontSize(10).text(`Berat: ${stt.berat} kg`, 50, 380);
  
  // Add payment info
  doc.fontSize(12).text('Informasi Pembayaran:', 300, 240);
  doc.fontSize(10).text(`Harga Per Kilo: Rp ${stt.hargaPerKilo.toLocaleString()}`, 300, 260);
  doc.fontSize(10).text(`Total Harga: Rp ${stt.harga.toLocaleString()}`, 300, 280);
  doc.fontSize(10).text(`Metode Pembayaran: ${stt.paymentType}`, 300, 300);
  
  if (stt.kodePenerus !== '70') {
    doc.fontSize(10).text(`Kode Penerus: ${stt.kodePenerus}`, 300, 320);
    if (stt.penerusId) {
      doc.fontSize(10).text(`Penerus: ${stt.penerusId.namaPenerus}`, 300, 340);
    }
  }
  
  if (stt.keterangan) {
    doc.fontSize(10).text(`Keterangan: ${stt.keterangan}`, 300, 360);
  }
  
  // Add signature section
  doc.fontSize(10).text('Petugas', 100, 450);
  doc.fontSize(10).text('Pengirim', 300, 450);
  doc.fontSize(10).text('Penerima', 500, 450);
  
  // Add lines for signatures
  doc.moveTo(50, 500).lineTo(150, 500).stroke();
  doc.moveTo(250, 500).lineTo(350, 500).stroke();
  doc.moveTo(450, 500).lineTo(550, 500).stroke();
  
  // Add footer
  doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 550);
  doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 570);
  
  // Finalize PDF
  doc.end();
};

/**
 * Generate Invoice PDF
 * @param {Object} collection - Collection data with populated references
 * @param {WritableStream} stream - Stream to pipe the PDF to
 */
exports.generateInvoicePDF = (collection, stream) => {
  // Create a document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Pipe the PDF to the stream
  doc.pipe(stream);
  
  // Add logo and header
  // doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
  doc.fontSize(16).text('SAMUDRA EKSPEDISI', 50, 50);
  doc.fontSize(14).text('INVOICE', 50, 70);
  doc.fontSize(10).text(`Nomor: ${collection.noPenagihan}`, 50, 90);
  doc.fontSize(10).text(`Tanggal: ${new Date(collection.createdAt).toLocaleDateString('id-ID')}`, 50, 105);
  
  // Add customer info
  doc.fontSize(12).text('Kepada Yth:', 350, 70);
  doc.fontSize(10).text(`${collection.pelangganId.nama}`, 350, 90);
  doc.fontSize(10).text(`${collection.pelangganId.alamat}`, 350, 105);
  doc.fontSize(10).text(`${collection.pelangganId.kota}, ${collection.pelangganId.provinsi}`, 350, 120);
  doc.fontSize(10).text(`Telepon: ${collection.pelangganId.telepon}`, 350, 135);
  
  // Add horizontal line
  doc.moveTo(50, 160).lineTo(550, 160).stroke();
  
  // Add table header
  doc.fontSize(10).text('No.', 50, 170);
  doc.fontSize(10).text('No. STT', 80, 170);
  doc.fontSize(10).text('Tanggal', 160, 170);
  doc.fontSize(10).text('Asal', 230, 170);
  doc.fontSize(10).text('Tujuan', 300, 170);
  doc.fontSize(10).text('Barang', 370, 170);
  doc.fontSize(10).text('Jumlah', 470, 170);
  
  // Add horizontal line
  doc.moveTo(50, 185).lineTo(550, 185).stroke();
  
  // Add table content
  let y = 200;
  let totalAmount = 0;
  
  collection.sttIds.forEach((stt, index) => {
    doc.fontSize(10).text((index + 1).toString(), 50, y);
    doc.fontSize(10).text(stt.noSTT, 80, y);
    doc.fontSize(10).text(new Date(stt.createdAt).toLocaleDateString('id-ID'), 160, y);
    doc.fontSize(10).text(stt.cabangAsalId.namaCabang, 230, y);
    doc.fontSize(10).text(stt.cabangTujuanId.namaCabang, 300, y);
    doc.fontSize(10).text(stt.namaBarang, 370, y);
    doc.fontSize(10).text(`Rp ${stt.harga.toLocaleString()}`, 470, y, { align: 'right' });
    
    totalAmount += stt.harga;
    y += 20;
    
    // Add new page if needed
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });
  
  // Add horizontal line
  doc.moveTo(50, y).lineTo(550, y).stroke();
  
  // Add total
  y += 15;
  doc.fontSize(10).text('Total', 400, y);
  doc.fontSize(10).text(`Rp ${totalAmount.toLocaleString()}`, 470, y, { align: 'right' });
  
  // Add payment info
  y += 40;
  doc.fontSize(12).text('Informasi Pembayaran:', 50, y);
  y += 20;
  doc.fontSize(10).text('Bank: BANK BCA', 50, y);
  y += 15;
  doc.fontSize(10).text('Nomor Rekening: 123-456-7890', 50, y);
  y += 15;
  doc.fontSize(10).text('Atas Nama: PT SAMUDRA EKSPEDISI', 50, y);
  y += 15;
  
  // Add status
  if (collection.status === 'LUNAS') {
    doc.fontSize(14).fillColor('green').text('LUNAS', 400, y - 50, { align: 'center' });
    if (collection.tanggalBayar) {
      doc.fontSize(10).text(`Tanggal Pembayaran: ${new Date(collection.tanggalBayar).toLocaleDateString('id-ID')}`, 400, y - 30);
    }
  } else {
    doc.fontSize(14).fillColor('red').text('BELUM LUNAS', 400, y - 50, { align: 'center' });
    if (collection.overdue) {
      doc.fontSize(10).text('Status: OVERDUE', 400, y - 30);
    }
  }
  doc.fillColor('black');
  
  // Add footer
  doc.fontSize(10).text('Hormat Kami,', 470, y);
  y += 60;
  doc.fontSize(10).text('Samudra Ekspedisi', 470, y);
  
  // Add footer
  doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 730);
  doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 745);
  
  // Finalize PDF
  doc.end();
};

/**
 * Generate Loading Manifest PDF
 * @param {Object} loading - Loading data with populated references
 * @param {WritableStream} stream - Stream to pipe the PDF to
 */
exports.generateLoadingManifestPDF = (loading, stream) => {
  // Create a document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Pipe the PDF to the stream
  doc.pipe(stream);
  
  // Add logo and header
  // doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
  doc.fontSize(16).text('SAMUDRA EKSPEDISI', 50, 50);
  doc.fontSize(14).text('Daftar Muat Barang (DMB)', 50, 70);
  doc.fontSize(10).text(`Nomor: ${loading.idMuat}`, 50, 90);
  doc.fontSize(10).text(`Tanggal: ${new Date(loading.createdAt).toLocaleDateString('id-ID')}`, 50, 105);
  
  // Add truck and driver info
  doc.fontSize(12).text('Informasi Kendaraan:', 350, 70);
  doc.fontSize(10).text(`No. Polisi: ${loading.antrianTruckId.truckId.noPolisi}`, 350, 90);
  doc.fontSize(10).text(`Supir: ${loading.antrianTruckId.supirId.nama}`, 350, 105);
  if (loading.antrianTruckId.kenekId) {
    doc.fontSize(10).text(`Kenek: ${loading.antrianTruckId.kenekId.nama}`, 350, 120);
  }
  
  // Add route info
  doc.fontSize(12).text('Rute Pengiriman:', 50, 130);
  doc.fontSize(10).text(`Dari: ${loading.cabangMuatId.namaCabang}`, 50, 150);
  doc.fontSize(10).text(`Ke: ${loading.cabangBongkarId.namaCabang}`, 50, 165);
  
  // Add checker info
  doc.fontSize(10).text(`Checker: ${loading.checkerId.nama}`, 350, 150);
  
  // Add horizontal line
  doc.moveTo(50, 190).lineTo(550, 190).stroke();
  
  // Add table header
  doc.fontSize(10).text('No.', 50, 200);
  doc.fontSize(10).text('No. STT', 80, 200);
  doc.fontSize(10).text('Pengirim', 160, 200);
  doc.fontSize(10).text('Penerima', 250, 200);
  doc.fontSize(10).text('Barang', 350, 200);
  doc.fontSize(10).text('Jumlah', 430, 200);
  doc.fontSize(10).text('Berat', 480, 200);
  
  // Add horizontal line
  doc.moveTo(50, 215).lineTo(550, 215).stroke();
  
  // Add table content
  let y = 230;
  let totalColly = 0;
  let totalWeight = 0;
  
  loading.sttIds.forEach((stt, index) => {
    doc.fontSize(10).text((index + 1).toString(), 50, y);
    doc.fontSize(10).text(stt.noSTT, 80, y);
    doc.fontSize(10).text(stt.pengirimId.nama, 160, y);
    doc.fontSize(10).text(stt.penerimaId.nama, 250, y);
    doc.fontSize(10).text(stt.namaBarang, 350, y);
    doc.fontSize(10).text(stt.jumlahColly.toString(), 430, y);
    doc.fontSize(10).text(`${stt.berat} kg`, 480, y);
    
    totalColly += stt.jumlahColly;
    totalWeight += stt.berat;
    y += 20;
    
    // Add new page if needed
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });
  
  // Add horizontal line
  doc.moveTo(50, y).lineTo(550, y).stroke();
  
  // Add total
  y += 15;
  doc.fontSize(10).text('Total', 350, y);
  doc.fontSize(10).text(totalColly.toString(), 430, y);
  doc.fontSize(10).text(`${totalWeight} kg`, 480, y);
  
  // Add signature section
  y += 40;
  doc.fontSize(10).text('Checker', 100, y);
  doc.fontSize(10).text('Supir', 300, y);
  doc.fontSize(10).text('Penerima', 500, y);
  
  // Add lines for signatures
  y += 50;
  doc.moveTo(50, y).lineTo(150, y).stroke();
  doc.moveTo(250, y).lineTo(350, y).stroke();
  doc.moveTo(450, y).lineTo(550, y).stroke();
  
  // Add status and timestamp
  y += 20;
  if (loading.status === 'MUAT') {
    doc.fontSize(12).text('Status: MUAT', 50, y);
  } else if (loading.status === 'BERANGKAT') {
    doc.fontSize(12).text('Status: BERANGKAT', 50, y);
    if (loading.waktuBerangkat) {
      doc.fontSize(10).text(`Waktu Berangkat: ${new Date(loading.waktuBerangkat).toLocaleString('id-ID')}`, 50, y + 15);
    }
  } else if (loading.status === 'SAMPAI') {
    doc.fontSize(12).text('Status: SAMPAI', 50, y);
    if (loading.waktuBerangkat) {
      doc.fontSize(10).text(`Waktu Berangkat: ${new Date(loading.waktuBerangkat).toLocaleString('id-ID')}`, 50, y + 15);
    }
    if (loading.waktuSampai) {
      doc.fontSize(10).text(`Waktu Sampai: ${new Date(loading.waktuSampai).toLocaleString('id-ID')}`, 50, y + 30);
    }
  }
  
  // Add footer
  doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 730);
  doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 745);
  
  // Finalize PDF
  doc.end();
};

/**
 * Generate Delivery Form PDF
 * @param {Object} delivery - Delivery data with populated references
 * @param {WritableStream} stream - Stream to pipe the PDF to
 */
exports.generateDeliveryFormPDF = (delivery, stream) => {
  // Create a document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Pipe the PDF to the stream
  doc.pipe(stream);
  
  // Add logo and header
  // doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
  doc.fontSize(16).text('SAMUDRA EKSPEDISI', 50, 50);
  doc.fontSize(14).text('Form Lansir', 50, 70);
  doc.fontSize(10).text(`Nomor: ${delivery.idLansir}`, 50, 90);
  doc.fontSize(10).text(`Tanggal: ${new Date(delivery.createdAt).toLocaleDateString('id-ID')}`, 50, 105);
  
  // Add vehicle and driver info
  doc.fontSize(12).text('Informasi Kendaraan:', 350, 70);
  doc.fontSize(10).text(`No. Polisi: ${delivery.antrianKendaraanId.kendaraanId.noPolisi}`, 350, 90);
  doc.fontSize(10).text(`Supir: ${delivery.antrianKendaraanId.supirId.nama}`, 350, 105);
  if (delivery.antrianKendaraanId.kenekId) {
    doc.fontSize(10).text(`Kenek: ${delivery.antrianKendaraanId.kenekId.nama}`, 350, 120);
  }
  
  // Add branch info
  doc.fontSize(12).text('Cabang:', 50, 130);
  doc.fontSize(10).text(`${delivery.cabangId.namaCabang}`, 50, 150);
  
  // Add staff info
  doc.fontSize(10).text(`Checker: ${delivery.checkerId.nama}`, 350, 150);
  doc.fontSize(10).text(`Admin: ${delivery.adminId.nama}`, 350, 165);
  
  // Add horizontal line
  doc.moveTo(50, 190).lineTo(550, 190).stroke();
  
  // Add table header
  doc.fontSize(10).text('No.', 50, 200);
  doc.fontSize(10).text('No. STT', 80, 200);
  doc.fontSize(10).text('Penerima', 160, 200);
  doc.fontSize(10).text('Alamat', 250, 200);
  doc.fontSize(10).text('Barang', 400, 200);
  doc.fontSize(10).text('Jumlah', 480, 200);
  
  // Add horizontal line
  doc.moveTo(50, 215).lineTo(550, 215).stroke();
  
  // Add table content
  let y = 230;
  
  delivery.sttIds.forEach((stt, index) => {
    doc.fontSize(10).text((index + 1).toString(), 50, y);
    doc.fontSize(10).text(stt.noSTT, 80, y);
    doc.fontSize(10).text(stt.penerimaId.nama, 160, y);
    
    // Handle long addresses by splitting them
    const address = stt.penerimaId.alamat;
    const maxWidth = 140; // Max width for address column
    
    const addressLines = doc.heightOfString(address, { width: maxWidth });
    const lineHeight = addressLines / (address.length / 50) || 12; // Estimate line height
    
    doc.fontSize(10).text(address, 250, y, { width: maxWidth });
    
    doc.fontSize(10).text(stt.namaBarang, 400, y);
    doc.fontSize(10).text(stt.jumlahColly.toString(), 480, y);
    
    // Adjust y position based on address length
    const addressLinesCount = Math.ceil(addressLines / lineHeight);
    y += Math.max(20, addressLinesCount * lineHeight);
    
    // Add new page if needed
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });
  
  // Add horizontal line
  doc.moveTo(50, y).lineTo(550, y).stroke();
  
  // Add delivery status and details
  y += 20;
  doc.fontSize(12).text('Status Pengiriman:', 50, y);
  y += 15;
  doc.fontSize(10).text(`Status: ${delivery.status}`, 50, y);
  y += 15;
  
  if (delivery.berangkat) {
    doc.fontSize(10).text(`Waktu Berangkat: ${new Date(delivery.berangkat).toLocaleString('id-ID')}`, 50, y);
    y += 15;
  }
  
  if (delivery.sampai) {
    doc.fontSize(10).text(`Waktu Sampai: ${new Date(delivery.sampai).toLocaleString('id-ID')}`, 50, y);
    y += 15;
  }
  
  if (delivery.kilometerBerangkat) {
    doc.fontSize(10).text(`Kilometer Berangkat: ${delivery.kilometerBerangkat}`, 50, y);
    y += 15;
  }
  
  if (delivery.kilometerPulang) {
    doc.fontSize(10).text(`Kilometer Pulang: ${delivery.kilometerPulang}`, 50, y);
    y += 15;
  }
  
  if (delivery.namaPenerima) {
    doc.fontSize(10).text(`Diterima Oleh: ${delivery.namaPenerima}`, 50, y);
    y += 15;
  }
  
  if (delivery.keterangan) {
    doc.fontSize(10).text(`Keterangan: ${delivery.keterangan}`, 50, y);
    y += 15;
  }
  
  // Add signature section
  y = Math.max(y, 600); // Ensure enough space for signatures
  doc.fontSize(10).text('Checker', 100, y);
  doc.fontSize(10).text('Supir', 300, y);
  doc.fontSize(10).text('Penerima', 500, y);
  
  // Add lines for signatures
  y += 50;
  doc.moveTo(50, y).lineTo(150, y).stroke();
  doc.moveTo(250, y).lineTo(350, y).stroke();
  doc.moveTo(450, y).lineTo(550, y).stroke();
  
  // Add footer
  doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 730);
  doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 745);
  
  // Finalize PDF
  doc.end();
};