/**
 * Generic role-based access control (RBAC) middleware.
 *
 * Must run AFTER `protect`, which authenticates the JWT and sets `req.user`
 * (containing `id` and `role`). Usage:
 *
 *   router.get("/x", protect, authorizeRoles("buyer"), controller);
 *   router.get("/y", protect, authorizeRoles("admin", "owner"), controller);
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied — this action requires role: ${allowedRoles.join(
          " or "
        )}`,
      });
    }

    next();
  };
};
