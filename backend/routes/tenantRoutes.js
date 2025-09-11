const express = require("express");
const {
  getHotelInfo,
  checkSubdomain,
  getPublicHotels,
  getHotelStats,
  refreshHotelCache,
} = require("../controllers/tenantController");
const {
  requireTenant,
  requireMainDomain,
} = require("../middleware/tenantMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes (work on both main and tenant domains)
router.get("/check-subdomain/:subdomain", checkSubdomain);

// Main domain only routes
router.get("/public", requireMainDomain, getPublicHotels);
router.get(
  "/stats",
  requireMainDomain,
  protect,
  authorize("admin"),
  getHotelStats
);

// Tenant domain only routes
router.get("/info", requireTenant, getHotelInfo);
router.post("/refresh-cache", requireTenant, protect, refreshHotelCache);

module.exports = router;
