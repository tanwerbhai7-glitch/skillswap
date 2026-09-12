const express = require("express");
const reviewController = require("../controllers/review.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { createReviewValidator } = require("../validators/review.validator");

const router = express.Router();

router.get("/", reviewController.listReviews);
router.post("/", createReviewValidator, validateRequest, reviewController.createReview);
router.delete("/:id", validateObjectId("id"), reviewController.deleteReview);

module.exports = router;
