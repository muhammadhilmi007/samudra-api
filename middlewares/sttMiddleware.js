const Pickup = require('../models/Pickup');
const STT = require('../models/STT');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Middleware to validate and synchronize STT operations
 */
exports.validateSTTOperation = async (req, res, next) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate('sttIds', 'noSTT status');

    if (!pickup) {
      return next(new ErrorResponse('Pengambilan tidak ditemukan', 404));
    }

    // Prevent STT operations on cancelled pickups
    if (pickup.status === 'CANCELLED') {
      return next(new ErrorResponse('Tidak dapat memodifikasi STT pada pengambilan yang dibatalkan', 400));
    }

    // Prevent STT operations on completed pickups
    if (pickup.status === 'SELESAI') {
      return next(new ErrorResponse('Tidak dapat memodifikasi STT pada pengambilan yang sudah selesai', 400));
    }

    // Validate STT status when completing pickup
    if (req.body.status === 'SELESAI') {
      if (!pickup.sttIds || pickup.sttIds.length === 0) {
        return next(new ErrorResponse('Tidak dapat menyelesaikan pengambilan tanpa STT', 400));
      }

      const invalidStts = pickup.sttIds.filter(stt => 
        !['SELESAI', 'DITERIMA'].includes(stt.status)
      );

      if (invalidStts.length > 0) {
        return next(
          new ErrorResponse(
            `Terdapat ${invalidStts.length} STT yang belum selesai: ${
              invalidStts.map(stt => stt.noSTT).join(', ')
            }`,
            400
          )
        );
      }
    }

    // Add STT validation
    if (req.body.sttIds) {
      const stts = await STT.find({ _id: { $in: req.body.sttIds } });
      
      // Check if all STTs exist
      if (stts.length !== req.body.sttIds.length) {
        return next(new ErrorResponse('Beberapa STT tidak ditemukan', 404));
      }

      // Check if STTs are already assigned to other pickups
      const existingPickups = await Pickup.find({
        _id: { $ne: pickup._id },
        sttIds: { $in: req.body.sttIds }
      });

      if (existingPickups.length > 0) {
        const assignedStts = existingPickups.map(p => 
          p.sttIds.filter(id => req.body.sttIds.includes(id.toString()))
        ).flat();

        return next(
          new ErrorResponse(
            `Beberapa STT sudah terhubung dengan pengambilan lain: ${assignedStts.join(', ')}`,
            400
          )
        );
      }

      // Check STT status compatibility
      const invalidStatusStts = stts.filter(stt => 
        !['PENDING', 'PROSES'].includes(stt.status)
      );

      if (invalidStatusStts.length > 0) {
        return next(
          new ErrorResponse(
            `Beberapa STT memiliki status yang tidak valid: ${
              invalidStatusStts.map(stt => `${stt.noSTT} (${stt.status})`).join(', ')
            }`,
            400
          )
        );
      }
    }

    // Store validated data for the next middleware
    req.pickup = pickup;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to update STT status based on pickup status
 */
exports.syncSTTStatus = async (req, res, next) => {
  try {
    const pickup = req.pickup;
    
    if (!pickup.sttIds || pickup.sttIds.length === 0) {
      return next();
    }

    // Update STT status based on pickup status
    if (req.body.status) {
      let sttStatus;
      switch (req.body.status) {
        case 'BERANGKAT':
          sttStatus = 'PROSES';
          break;
        case 'SELESAI':
          sttStatus = 'SELESAI';
          break;
        case 'CANCELLED':
          sttStatus = 'CANCELLED';
          break;
        default:
          return next();
      }

      // Update all associated STTs
      await STT.updateMany(
        { _id: { $in: pickup.sttIds } },
        { 
          $set: { 
            status: sttStatus,
            lastUpdated: new Date(),
            lastUpdatedBy: req.user._id
          }
        }
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};