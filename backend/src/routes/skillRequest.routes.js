const express = require("express");
const requestController = require("../controllers/skillRequest.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { createRequestValidator, updateStatusValidator } = require("../validators/skillRequest.validator");

const router = express.Router();

router.get("/", requestController.listRequests);
router.get("/:id", validateObjectId("id"), requestController.getRequest);
router.post("/", createRequestValidator, validateRequest, requestController.createRequest);
router.patch(
  "/:id/status",
  validateObjectId("id"),
  updateStatusValidator,
  validateRequest,
  requestController.updateStatus
);
router.delete("/:id", validateObjectId("id"), requestController.deleteRequest);

module.exports = router;
