const { z } = require('zod');

// Branch validation schema for API requests
exports.branchSchema = z.object({
  namaCabang: z.string().min(2, 'Nama cabang minimal 2 karakter'),
  divisiId: z.string().min(1, 'Divisi harus diisi'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  kelurahan: z.string().min(2, 'Kelurahan minimal 2 karakter'),
  kecamatan: z.string().min(2, 'Kecamatan minimal 2 karakter'),
  kota: z.string().min(2, 'Kota minimal 2 karakter'),
  provinsi: z.string().min(2, 'Provinsi minimal 2 karakter'),
  kontakPenanggungJawab: z.object({
    nama: z.string().optional().default(''),
    telepon: z.string().optional().default(''),
    email: z.string().email('Email tidak valid').optional().nullable().default('')
  }).optional().default({
    nama: '',
    telepon: '',
    email: ''
  }),
  // Support for dot notation format (from frontend forms)
  'kontakPenanggungJawab.nama': z.string().optional(),
  'kontakPenanggungJawab.telepon': z.string().optional(),
  'kontakPenanggungJawab.email': z.string().email('Email tidak valid').optional().nullable()
}).refine(data => {
  // If using dot notation, ensure at least one field is provided
  if (data['kontakPenanggungJawab.nama'] !== undefined ||
      data['kontakPenanggungJawab.telepon'] !== undefined ||
      data['kontakPenanggungJawab.email'] !== undefined) {
    
    return true;
  }
  
  // Otherwise, ensure the nested kontakPenanggungJawab object is valid
  return data.kontakPenanggungJawab !== undefined;
}, {
  message: 'Kontak penanggung jawab harus diisi'
});

// Validator for branch creation
exports.validateBranchCreate = (data) => {
  try {
    // Format data for validation
    const formattedData = { ...data };
    
    // Handle kontakPenanggungJawab in dot notation format
    if (data['kontakPenanggungJawab.nama'] !== undefined ||
        data['kontakPenanggungJawab.telepon'] !== undefined ||
        data['kontakPenanggungJawab.email'] !== undefined) {
      
      formattedData.kontakPenanggungJawab = {
        nama: data['kontakPenanggungJawab.nama'] || '',
        telepon: data['kontakPenanggungJawab.telepon'] || '',
        email: data['kontakPenanggungJawab.email'] || ''
      };
    }
    
    // Perform validation (but don't throw exception)
    const result = this.branchSchema.safeParse(formattedData);
    
    if (result.success) {
      // If validation passed, return formatted data
      return { 
        valid: true, 
        data: formattedData 
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join('.')] = err.message;
      });
      
      return { 
        valid: false, 
        errors: formattedErrors
      };
    }
  } catch (error) {
    console.error('Branch validation error:', error);
    return { 
      valid: false, 
      errors: { general: 'Validasi cabang gagal' } 
    };
  }
};

// Validator for branch update (partial schema)
exports.validateBranchUpdate = (data) => {
  try {
    // Create a partial schema for updates
    const updateSchema = this.branchSchema.partial();
    
    // Format data for validation
    const formattedData = { ...data };
    
    // Handle kontakPenanggungJawab in dot notation format
    if (data['kontakPenanggungJawab.nama'] !== undefined ||
        data['kontakPenanggungJawab.telepon'] !== undefined ||
        data['kontakPenanggungJawab.email'] !== undefined) {
      
      formattedData.kontakPenanggungJawab = {
        nama: data['kontakPenanggungJawab.nama'] || '',
        telepon: data['kontakPenanggungJawab.telepon'] || '',
        email: data['kontakPenanggungJawab.email'] || ''
      };
    }
    
    // Perform validation (but don't throw exception)
    const result = updateSchema.safeParse(formattedData);
    
    if (result.success) {
      // If validation passed, return formatted data
      return { 
        valid: true, 
        data: formattedData 
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join('.')] = err.message;
      });
      
      return { 
        valid: false, 
        errors: formattedErrors
      };
    }
  } catch (error) {
    console.error('Branch update validation error:', error);
    return { 
      valid: false, 
      errors: { general: 'Validasi cabang gagal' } 
    };
  }
};