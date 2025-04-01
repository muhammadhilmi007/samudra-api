// utils/validators/pickupRequestValidator.js
const { z } = require("zod");

// Pickup Request validation schema for API requests
exports.pickupRequestSchema = z.object({
  tanggal: z.string().or(z.date()).optional(),
  pengirimId: z.string().min(1, "Pengirim harus diisi"),
  alamatPengambilan: z.string().min(5, "Alamat pengambilan minimal 5 karakter"),
  tujuan: z.string().min(2, "Tujuan minimal 2 karakter"),
  jumlahColly: z
    .number()
    .min(1, "Jumlah colly minimal 1")
    .or(z.string().regex(/^\d+$/).transform(Number)),
  estimasiPengambilan: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "FINISH", "CANCELLED"]).optional(),
});

// Schema for status update
exports.statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "FINISH", "CANCELLED"]),
  notes: z.string().optional().nullable(),
});

// Schema for linking to pickup
exports.linkSchema = z.object({
  pickupId: z.string().min(1, "ID Pengambilan harus diisi"),
});

// Validator for creating a pickup request
exports.validatePickupRequestCreate = (data) => {
  try {
    // Format data for validation
    const formattedData = { ...data };

    // Convert jumlahColly to number if it's a string
    if (typeof formattedData.jumlahColly === "string") {
      formattedData.jumlahColly = parseInt(formattedData.jumlahColly, 10);
    }

    // Perform validation (but don't throw exception)
    const result = this.pickupRequestSchema.safeParse(formattedData);

    if (result.success) {
      // If validation passed, return formatted data
      return {
        valid: true,
        data: formattedData,
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join(".")] = err.message;
      });

      return {
        valid: false,
        errors: formattedErrors,
      };
    }
  } catch (error) {
    console.error("PickupRequest validation error:", error);
    return {
      valid: false,
      errors: { general: "Validasi request pengambilan gagal" },
    };
  }
};

// Validator for updating a pickup request
// Validator for updating a pickup request
exports.validatePickupRequestUpdate = (data) => {
  try {
    // Create a partial schema for updates
    const updateSchema = this.pickupRequestSchema.partial();

    // Format data for validation
    const formattedData = { ...data };

    // Convert jumlahColly to number if it's a string
    if (typeof formattedData.jumlahColly === "string") {
      formattedData.jumlahColly = parseInt(formattedData.jumlahColly, 10);
    }

    // Perform validation (but don't throw exception)
    const result = updateSchema.safeParse(formattedData);

    if (result.success) {
      // If validation passed, return formatted data
      return {
        valid: true,
        data: formattedData,
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join(".")] = err.message;
      });

      return {
        valid: false,
        errors: formattedErrors,
      };
    }
  } catch (error) {
    console.error("PickupRequest update validation error:", error);
    return {
      valid: false,
      errors: { general: "Validasi update request pengambilan gagal" },
    };
  }
};

// Validator for status update
exports.validateStatusUpdate = (data) => {
  try {
    // Perform validation
    const result = this.statusUpdateSchema.safeParse(data);

    if (result.success) {
      return {
        valid: true,
        data: result.data,
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join(".")] = err.message;
      });

      return {
        valid: false,
        errors: formattedErrors,
      };
    }
  } catch (error) {
    console.error("Status update validation error:", error);
    return {
      valid: false,
      errors: { general: "Validasi status gagal" },
    };
  }
};

// Validator for link to pickup
exports.validateLink = (data) => {
  try {
    // Perform validation
    const result = this.linkSchema.safeParse(data);

    if (result.success) {
      return {
        valid: true,
        data: result.data,
      };
    } else {
      // Format validation errors
      const formattedErrors = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path.join(".")] = err.message;
      });

      return {
        valid: false,
        errors: formattedErrors,
      };
    }
  } catch (error) {
    console.error("Link validation error:", error);
    return {
      valid: false,
      errors: { general: "Validasi link pickup gagal" },
    };
  }
};
