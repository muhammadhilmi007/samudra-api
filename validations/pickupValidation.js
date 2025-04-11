// validations/pickupValidation.js
const { z } = require("zod");
const mongoose = require("mongoose");

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return id === null || id === undefined || mongoose.Types.ObjectId.isValid(id);
};

// Schema for creating a pickup
const create = z
  .object({
    pengirimId: z.string().refine(isValidObjectId, {
      message: "ID pengirim tidak valid",
    }),
    alamatPengambilan: z
      .string()
      .min(3, "Alamat pengambilan minimal 3 karakter"),
    tujuan: z.string().min(2, "Tujuan minimal 2 karakter"),
    jumlahColly: z
      .number()
      .positive("Jumlah colly harus lebih dari 0")
      .or(
        z.string().refine((val) => !isNaN(val) && parseInt(val) > 0, {
          message: "Jumlah colly harus lebih dari 0",
        })
      ),
    supirId: z.string().refine(isValidObjectId, {
      message: "ID supir tidak valid",
    }),
    kenekId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID kenek tidak valid",
      })
      .nullable()
      .optional(),
    kendaraanId: z.string().refine(isValidObjectId, {
      message: "ID kendaraan tidak valid",
    }),
    estimasiPengambilan: z.string().optional(),
    notes: z.string().optional(),
    status: z
      .enum(["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"])
      .default("PENDING"),
    requestId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID request tidak valid",
      })
      .optional(),
  })
  .strict();

// Schema for updating a pickup
const update = z
  .object({
    pengirimId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID pengirim tidak valid",
      })
      .optional(),
    alamatPengambilan: z
      .string()
      .min(3, "Alamat pengambilan minimal 3 karakter")
      .optional(),
    tujuan: z.string().min(2, "Tujuan minimal 2 karakter").optional(),
    jumlahColly: z
      .number()
      .positive("Jumlah colly harus lebih dari 0")
      .or(
        z.string().refine((val) => !isNaN(val) && parseInt(val) > 0, {
          message: "Jumlah colly harus lebih dari 0",
        })
      )
      .optional(),
    supirId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID supir tidak valid",
      })
      .optional(),
    kenekId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID kenek tidak valid",
      })
      .nullable()
      .optional(),
    kendaraanId: z
      .string()
      .refine(isValidObjectId, {
        message: "ID kendaraan tidak valid",
      })
      .optional(),
    estimasiPengambilan: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"]).optional(),
  })
  .strict();

// Schema for updating pickup status
const updateStatus = z
  .object({
    status: z.enum(["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"], {
      errorMap: () => ({ message: "Status tidak valid" }),
    }),
    notes: z.string().optional(),
  })
  .strict();

// Schema for adding STT to pickup
const addSTT = z
  .object({
    sttId: z.string().refine(isValidObjectId, {
      message: "ID STT tidak valid",
    }),
  })
  .strict();

// Schema for removing STT from pickup
const removeSTT = z
  .object({
    sttId: z.string().refine(isValidObjectId, {
      message: "ID STT tidak valid",
    }),
  })
  .strict();

module.exports = {
  create,
  update,
  updateStatus,
  addSTT,
  removeSTT,
};
