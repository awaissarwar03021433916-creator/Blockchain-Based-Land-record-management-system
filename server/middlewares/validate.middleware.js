import mongoose from "mongoose";
import { SELF_ASSIGNABLE_ROLES } from "../config/constants.js";

/**
 * Request validation middleware.
 *
 * This layer validates the SHAPE of input (presence, type, format) so that
 * controllers can assume well-formed data and focus purely on business rules.
 * It does not touch the database. Every validator emits an identical
 * { message: "Validation failed", errors: [...] } body on a 400.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Shared 400 responder — guarantees one consistent error shape everywhere.
const fail = (res, errors) =>
  res.status(400).json({ message: "Validation failed", errors });

// Validates that a route parameter is a well-formed Mongo ObjectId.
// Reusable across any route with an :id-style param:
//   router.put("/x/:requestId", validateObjectId("requestId"), controller);
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return fail(res, [`${paramName} must be a valid ID`]);
    }
    next();
  };
};

// POST /api/auth/register
export const validateRegister = (req, res, next) => {
  const errors = [];
  const { name, email, password, walletAddress, role } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("name is required (minimum 2 characters)");
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push("a valid email is required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("password is required (minimum 6 characters)");
  }
  if (
    walletAddress !== undefined &&
    walletAddress !== "" &&
    !ETH_ADDRESS_REGEX.test(walletAddress)
  ) {
    errors.push("walletAddress must be a valid Ethereum address");
  }
  if (
    role !== undefined &&
    !SELF_ASSIGNABLE_ROLES.includes(String(role).toLowerCase())
  ) {
    errors.push(`role must be one of: ${SELF_ASSIGNABLE_ROLES.join(", ")}`);
  }

  if (errors.length) return fail(res, errors);
  next();
};

// POST /api/auth/login
export const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push("a valid email is required");
  }
  if (!password) {
    errors.push("password is required");
  }

  if (errors.length) return fail(res, errors);
  next();
};

// POST /api/land/register  (new-land registration — was /api/land/submit
// before the sale-listing repurpose in turn 10)
export const validateLandSubmission = (req, res, next) => {
  const errors = [];
  const { plotNumber, location, area } = req.body;

  if (!plotNumber || String(plotNumber).trim() === "") {
    errors.push("plotNumber is required");
  } else if (String(plotNumber).trim().length > MAX_PLOT_NUMBER) {
    errors.push(`plotNumber cannot exceed ${MAX_PLOT_NUMBER} characters`);
  }
  if (!location || String(location).trim() === "") {
    errors.push("location is required");
  } else if (String(location).trim().length > MAX_LOCATION) {
    errors.push(`location cannot exceed ${MAX_LOCATION} characters`);
  }
  if (!area || String(area).trim() === "") {
    errors.push("area is required");
  } else if (String(area).trim().length > MAX_AREA) {
    errors.push(`area cannot exceed ${MAX_AREA} characters`);
  }

  if (errors.length) return fail(res, errors);
  next();
};

// Reject-action body validator — shared by owner and admin reject routes.
// `reason` is optional; if provided it must be a string under 500 chars
// (matches TransferRequest.rejectionReason schema cap). Catches type
// confusion (e.g. number/object) before the controller does `.trim()`.
export const validateRejectReason = (req, res, next) => {
  const errors = [];
  const { reason } = req.body || {};

  if (reason !== undefined && reason !== null) {
    if (typeof reason !== "string") {
      errors.push("reason must be a string");
    } else if (reason.trim().length > 500) {
      errors.push("reason cannot exceed 500 characters");
    }
  }

  if (errors.length) return fail(res, errors);
  next();
};

// Shared length caps. Keep these in lockstep with the Land schema's
// maxlength values — the middleware fires at the boundary for clean
// 400 responses; the schema is the defense-in-depth backstop.
const MAX_PLOT_NUMBER = 64;
const MAX_LOCATION = 200;
const MAX_AREA = 64;

// POST /api/land/submit  (sale listing — no area field, identifies an
// existing land by plot + location coordinates)
export const validateLandListing = (req, res, next) => {
  const errors = [];
  const { plotNumber, location } = req.body || {};

  if (!plotNumber || String(plotNumber).trim() === "") {
    errors.push("plotNumber is required");
  } else if (String(plotNumber).trim().length > MAX_PLOT_NUMBER) {
    errors.push(`plotNumber cannot exceed ${MAX_PLOT_NUMBER} characters`);
  }
  if (!location || String(location).trim() === "") {
    errors.push("location is required");
  } else if (String(location).trim().length > MAX_LOCATION) {
    errors.push(`location cannot exceed ${MAX_LOCATION} characters`);
  }

  if (errors.length) return fail(res, errors);
  next();
};

// POST /api/buyer/transfer-requests
export const validateTransferRequest = (req, res, next) => {
  const errors = [];
  const { landId, requestMessage } = req.body;

  if (!landId || !mongoose.Types.ObjectId.isValid(landId)) {
    errors.push("landId is required and must be a valid ID");
  }
  if (requestMessage !== undefined) {
    if (typeof requestMessage !== "string") {
      errors.push("requestMessage must be a string");
    } else if (requestMessage.trim().length > 500) {
      errors.push("requestMessage cannot exceed 500 characters");
    }
  }

  if (errors.length) return fail(res, errors);
  next();
};
