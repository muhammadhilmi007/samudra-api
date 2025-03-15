const ExcelJS = require('exceljs');

/**
 * Generate Excel file with STT data
 * @param {Array} stts - Array of STT objects
 * @param {WritableStream} stream - Stream to pipe the Excel file to
 */
exports.exportSTTsToExcel = async (stts, stream) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('STT Data');
  
  // Add header row
  worksheet.columns = [
    { header: 'No. STT', key: 'noSTT', width: 15 },
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Cabang Asal', key: 'cabangAsal', width: 15 },
    { header: 'Cabang Tujuan', key: 'cabangTujuan', width: 15 },
    { header: 'Pengirim', key: 'pengirim', width: 20 },
    { header: 'Penerima', key: 'penerima', width: 20 },
    { header: 'Nama Barang', key: 'namaBarang', width: 20 },
    { header: 'Komoditi', key: 'komoditi', width: 15 },
    { header: 'Packing', key: 'packing', width: 15 },
    { header: 'Jumlah Colly', key: 'jumlahColly', width: 10 },
    { header: 'Berat (kg)', key: 'berat', width: 10 },
    { header: 'Harga/kg', key: 'hargaPerKilo', width: 12 },
    { header: 'Total Harga', key: 'harga', width: 15 },
    { header: 'Metode Bayar', key: 'paymentType', width: 12 },
    { header: 'Status', key: 'status', width: 12 }
  ];
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows
  stts.forEach(stt => {
    worksheet.addRow({
      noSTT: stt.noSTT,
      tanggal: new Date(stt.createdAt).toLocaleDateString('id-ID'),
      cabangAsal: stt.cabangAsalId.namaCabang,
      cabangTujuan: stt.cabangTujuanId.namaCabang,
      pengirim: stt.pengirimId.nama,
      penerima: stt.penerimaId.nama,
      namaBarang: stt.namaBarang,
      komoditi: stt.komoditi,
      packing: stt.packing,
      jumlahColly: stt.jumlahColly,
      berat: stt.berat,
      hargaPerKilo: stt.hargaPerKilo,
      harga: stt.harga,
      paymentType: stt.paymentType,
      status: stt.status
    });
  });
  
  // Format currency columns
  worksheet.getColumn('hargaPerKilo').numFmt = '#,##0.00';
  worksheet.getColumn('harga').numFmt = '#,##0.00';
  
  // Add totals row
  const totalRow = worksheet.addRow({
    pengirim: 'TOTAL',
    jumlahColly: stts.reduce((total, stt) => total + stt.jumlahColly, 0),
    berat: stts.reduce((total, stt) => total + stt.berat, 0),
    harga: stts.reduce((total, stt) => total + stt.harga, 0)
  });
  totalRow.font = { bold: true };
  
  // Write to stream
  await workbook.xlsx.write(stream);
};

/**
 * Generate Excel file with sales data
 * @param {Object} salesData - Object containing sales data
 * @param {WritableStream} stream - Stream to pipe the Excel file to
 */
exports.exportSalesToExcel = async (salesData, stream) => {
  const workbook = new ExcelJS.Workbook();
  
  // Summary worksheet
  const summarySheet = workbook.addWorksheet('Ringkasan');
  
  summarySheet.columns = [
    { header: 'Cabang', key: 'cabang', width: 20 },
    { header: 'Jumlah STT', key: 'jumlahSTT', width: 15 },
    { header: 'Total Colly', key: 'totalColly', width: 15 },
    { header: 'Total Berat (kg)', key: 'totalBerat', width: 15 },
    { header: 'Total Pendapatan', key: 'totalPendapatan', width: 20 }
  ];
  
  // Style the header row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows for each branch
  let totalSTT = 0;
  let totalColly = 0;
  let totalWeight = 0;
  let totalRevenue = 0;
  
  Object.entries(salesData.byBranch).forEach(([branchName, branchData]) => {
    summarySheet.addRow({
      cabang: branchName,
      jumlahSTT: branchData.count,
      totalColly: branchData.totalColly,
      totalBerat: branchData.totalWeight,
      totalPendapatan: branchData.totalRevenue
    });
    
    totalSTT += branchData.count;
    totalColly += branchData.totalColly;
    totalWeight += branchData.totalWeight;
    totalRevenue += branchData.totalRevenue;
  });
  
  // Add total row
  const totalRow = summarySheet.addRow({
    cabang: 'TOTAL',
    jumlahSTT: totalSTT,
    totalColly: totalColly,
    totalBerat: totalWeight,
    totalPendapatan: totalRevenue
  });
  totalRow.font = { bold: true };
  
  // Format currency column
  summarySheet.getColumn('totalPendapatan').numFmt = '#,##0.00';
  
  // Payment type breakdown
  const paymentSheet = workbook.addWorksheet('Berdasarkan Pembayaran');
  
  paymentSheet.columns = [
    { header: 'Tipe Pembayaran', key: 'tipe', width: 15 },
    { header: 'Jumlah STT', key: 'jumlahSTT', width: 15 },
    { header: 'Total Pendapatan', key: 'totalPendapatan', width: 20 },
    { header: 'Persentase', key: 'persentase', width: 15 }
  ];
  
  // Style the header row
  paymentSheet.getRow(1).font = { bold: true };
  paymentSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows for each payment type
  Object.entries(salesData.byPaymentType).forEach(([paymentType, paymentData]) => {
    const percentage = (paymentData.totalRevenue / totalRevenue) * 100;
    
    paymentSheet.addRow({
      tipe: paymentType,
      jumlahSTT: paymentData.count,
      totalPendapatan: paymentData.totalRevenue,
      persentase: percentage.toFixed(2)
    });
  });
  
  // Format currency and percentage columns
  paymentSheet.getColumn('totalPendapatan').numFmt = '#,##0.00';
  paymentSheet.getColumn('persentase').numFmt = '0.00%';
  
  // Daily sales worksheet
  const dailySheet = workbook.addWorksheet('Harian');
  
  dailySheet.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Jumlah STT', key: 'jumlahSTT', width: 15 },
    { header: 'Total Colly', key: 'totalColly', width: 15 },
    { header: 'Total Berat (kg)', key: 'totalBerat', width: 15 },
    { header: 'Total Pendapatan', key: 'totalPendapatan', width: 20 }
  ];
  
  // Style the header row
  dailySheet.getRow(1).font = { bold: true };
  dailySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows for each day
  Object.entries(salesData.byDate).forEach(([date, dateData]) => {
    dailySheet.addRow({
      tanggal: date,
      jumlahSTT: dateData.count,
      totalColly: dateData.totalColly,
      totalBerat: dateData.totalWeight,
      totalPendapatan: dateData.totalRevenue
    });
  });
  
  // Format currency column
  dailySheet.getColumn('totalPendapatan').numFmt = '#,##0.00';
  
  // Write to stream
  await workbook.xlsx.write(stream);
};

/**
 * Generate Excel file with finance data
 * @param {Object} financeData - Object containing finance data
 * @param {WritableStream} stream - Stream to pipe the Excel file to
 */
exports.exportFinanceToExcel = async (financeData, stream) => {
  const workbook = new ExcelJS.Workbook();
  
  // Journal entries worksheet
  const journalSheet = workbook.addWorksheet('Jurnal Umum');
  
  journalSheet.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Kode Akun', key: 'kodeAkun', width: 15 },
    { header: 'Nama Akun', key: 'namaAkun', width: 25 },
    { header: 'Cabang', key: 'cabang', width: 20 },
    { header: 'Keterangan', key: 'keterangan', width: 30 },
    { header: 'Debet', key: 'debet', width: 15 },
    { header: 'Kredit', key: 'kredit', width: 15 },
    { header: 'User', key: 'user', width: 20 }
  ];
  
  // Style the header row
  journalSheet.getRow(1).font = { bold: true };
  journalSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows for journal entries
  financeData.journals.forEach(journal => {
    journalSheet.addRow({
      tanggal: new Date(journal.tanggal).toLocaleDateString('id-ID'),
      kodeAkun: journal.accountId.kodeAccount,
      namaAkun: journal.accountId.namaAccount,
      cabang: journal.cabangId.namaCabang,
      keterangan: journal.keterangan,
      debet: journal.debet,
      kredit: journal.kredit,
      user: journal.userId.nama
    });
  });
  
  // Format currency columns
  journalSheet.getColumn('debet').numFmt = '#,##0.00';
  journalSheet.getColumn('kredit').numFmt = '#,##0.00';
  
  // Cash flow worksheet
  const cashFlowSheet = workbook.addWorksheet('Arus Kas');
  
  cashFlowSheet.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Tipe Kas', key: 'tipeKas', width: 15 },
    { header: 'Cabang', key: 'cabang', width: 20 },
    { header: 'Keterangan', key: 'keterangan', width: 30 },
    { header: 'Debet', key: 'debet', width: 15 },
    { header: 'Kredit', key: 'kredit', width: 15 },
    { header: 'Saldo', key: 'saldo', width: 15 },
    { header: 'User', key: 'user', width: 20 }
  ];
  
  // Style the header row
  cashFlowSheet.getRow(1).font = { bold: true };
  cashFlowSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows for cash flow
  financeData.cashFlow.forEach(cash => {
    cashFlowSheet.addRow({
      tanggal: new Date(cash.tanggal).toLocaleDateString('id-ID'),
      tipeKas: cash.tipeKas,
      cabang: cash.cabangId.namaCabang,
      keterangan: cash.keterangan,
      debet: cash.debet,
      kredit: cash.kredit,
      saldo: cash.saldo,
      user: cash.userId.nama
    });
  });
  
  // Format currency columns
  cashFlowSheet.getColumn('debet').numFmt = '#,##0.00';
  cashFlowSheet.getColumn('kredit').numFmt = '#,##0.00';
  cashFlowSheet.getColumn('saldo').numFmt = '#,##0.00';
  
  // Balance sheet worksheet
  if (financeData.balanceSheet) {
    const balanceSheet = workbook.addWorksheet('Neraca');
    
    // Assets
    balanceSheet.addRow(['ASET']);
    balanceSheet.addRow(['']);
    
    Object.entries(financeData.balanceSheet.assets).forEach(([accountName, amount]) => {
      balanceSheet.addRow([accountName, amount]);
    });
    
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['Total Aset', financeData.balanceSheet.totalAssets]);
    
    // Add some space
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['']);
    
    // Liabilities
    balanceSheet.addRow(['KEWAJIBAN']);
    balanceSheet.addRow(['']);
    
    Object.entries(financeData.balanceSheet.liabilities).forEach(([accountName, amount]) => {
      balanceSheet.addRow([accountName, amount]);
    });
    
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['Total Kewajiban', financeData.balanceSheet.totalLiabilities]);
    
    // Add some space
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['']);
    
    // Equity
    balanceSheet.addRow(['EKUITAS']);
    balanceSheet.addRow(['']);
    
    Object.entries(financeData.balanceSheet.equity).forEach(([accountName, amount]) => {
      balanceSheet.addRow([accountName, amount]);
    });
    
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['Total Ekuitas', financeData.balanceSheet.totalEquity]);
    
    // Add some space
    balanceSheet.addRow(['']);
    balanceSheet.addRow(['']);
    
    // Total
    balanceSheet.addRow(['Total Kewajiban dan Ekuitas', financeData.balanceSheet.totalLiabilitiesAndEquity]);
    
    // Format for better readability
    balanceSheet.getColumn(1).width = 40;
    balanceSheet.getColumn(2).width = 20;
    balanceSheet.getColumn(2).numFmt = '#,##0.00';
    
    // Make headers bold
    [1, 5, 9, 13, 17].forEach(rowIdx => {
      balanceSheet.getRow(rowIdx).font = { bold: true };
    });
  }
  
  // Income statement worksheet
  if (financeData.incomeStatement) {
    const incomeSheet = workbook.addWorksheet('Laba Rugi');
    
    // Revenue
    incomeSheet.addRow(['PENDAPATAN']);
    incomeSheet.addRow(['']);
    
    Object.entries(financeData.incomeStatement.revenue).forEach(([accountName, amount]) => {
      incomeSheet.addRow([accountName, amount]);
    });
    
    incomeSheet.addRow(['']);
    incomeSheet.addRow(['Total Pendapatan', financeData.incomeStatement.totalRevenue]);
    
    // Add some space
    incomeSheet.addRow(['']);
    incomeSheet.addRow(['']);
    
    // Expenses
    incomeSheet.addRow(['BEBAN']);
    incomeSheet.addRow(['']);
    
    Object.entries(financeData.incomeStatement.expenses).forEach(([accountName, amount]) => {
      incomeSheet.addRow([accountName, amount]);
    });
    
    incomeSheet.addRow(['']);
    incomeSheet.addRow(['Total Beban', financeData.incomeStatement.totalExpenses]);
    
    // Add some space
    incomeSheet.addRow(['']);
    incomeSheet.addRow(['']);
    
    // Net Income
    incomeSheet.addRow(['LABA/RUGI BERSIH', financeData.incomeStatement.netIncome]);
    
    // Format for better readability
    incomeSheet.getColumn(1).width = 40;
    incomeSheet.getColumn(2).width = 20;
    incomeSheet.getColumn(2).numFmt = '#,##0.00';
    
    // Make headers bold
    [1, 5, 9, 13, 17].forEach(rowIdx => {
      incomeSheet.getRow(rowIdx).font = { bold: true };
    });
  }
  
  // Write to stream
  await workbook.xlsx.write(stream);
};

/**
 * Generate Excel file with receivables data
 * @param {Array} collections - Array of collection objects
 * @param {WritableStream} stream - Stream to pipe the Excel file to
 */
exports.exportReceivablesToExcel = async (collections, stream) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Piutang');
  
  // Add header row
  worksheet.columns = [
    { header: 'No. Penagihan', key: 'noPenagihan', width: 15 },
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Pelanggan', key: 'pelanggan', width: 25 },
    { header: 'Tipe Pelanggan', key: 'tipePelanggan', width: 15 },
    { header: 'Cabang', key: 'cabang', width: 15 },
    { header: 'Jumlah STT', key: 'jumlahSTT', width: 10 },
    { header: 'Total Tagihan', key: 'totalTagihan', width: 15 },
    { header: 'Jumlah Dibayar', key: 'jumlahDibayar', width: 15 },
    { header: 'Sisa Tagihan', key: 'sisaTagihan', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Overdue', key: 'overdue', width: 10 }
  ];
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows
  let totalTagihan = 0;
  let totalDibayar = 0;
  let totalSisa = 0;
  
  collections.forEach(collection => {
    const jumlahDibayar = collection.jumlahBayarTermin.reduce((total, termin) => total + termin.jumlah, 0);
    const sisaTagihan = collection.totalTagihan - jumlahDibayar;
    
    worksheet.addRow({
      noPenagihan: collection.noPenagihan,
      tanggal: new Date(collection.createdAt).toLocaleDateString('id-ID'),
      pelanggan: collection.pelangganId.nama,
      tipePelanggan: collection.tipePelanggan,
      cabang: collection.cabangId.namaCabang,
      jumlahSTT: collection.sttIds.length,
      totalTagihan: collection.totalTagihan,
      jumlahDibayar: jumlahDibayar,
      sisaTagihan: sisaTagihan,
      status: collection.status,
      overdue: collection.overdue ? 'Ya' : 'Tidak'
    });
    
    totalTagihan += collection.totalTagihan;
    totalDibayar += jumlahDibayar;
    totalSisa += sisaTagihan;
  });
  
  // Add totals row
  const totalRow = worksheet.addRow({
    pelanggan: 'TOTAL',
    totalTagihan: totalTagihan,
    jumlahDibayar: totalDibayar,
    sisaTagihan: totalSisa
  });
  totalRow.font = { bold: true };
  
  // Format currency columns
  worksheet.getColumn('totalTagihan').numFmt = '#,##0.00';
  worksheet.getColumn('jumlahDibayar').numFmt = '#,##0.00';
  worksheet.getColumn('sisaTagihan').numFmt = '#,##0.00';
  
  // Write to stream
  await workbook.xlsx.write(stream);
};