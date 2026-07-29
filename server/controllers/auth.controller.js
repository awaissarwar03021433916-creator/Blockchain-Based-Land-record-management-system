import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  ADMIN_EMAIL,
  SELF_ASSIGNABLE_ROLES,
  BCRYPT_SALT_ROUNDS,
} from "../config/constants.js";

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Role assignment.
    // - admin: provisioned ONLY by the reserved email; never self-assignable.
    // - everyone else: picks "owner" or "buyer" at registration (default owner).
    let role;
    if (email === ADMIN_EMAIL) {
      role = "admin";
    } else {
      const requestedRole = (req.body.role || "owner").toLowerCase();
      if (!SELF_ASSIGNABLE_ROLES.includes(requestedRole)) {
        return res
          .status(400)
          .json({ message: "Role must be either 'owner' or 'buyer'" });
      }
      role = requestedRole;
    }

    // Hash password (work factor is env/NODE_ENV driven — see BCRYPT_SALT_ROUNDS).
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      walletAddress,
      role,
    });

    res.status(201).json({
      message: "user registered successfully ✅",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Force single admin rule at login (extra safety)
    const role = user.email === ADMIN_EMAIL ? "admin" : user.role;

    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
