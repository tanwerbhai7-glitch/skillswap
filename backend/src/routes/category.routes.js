const express = require("express");
const categoryController = require("../controllers/category.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { createCategoryValidator } = require("../validators/category.validator");

const router = express.Router();

router.get("/", categoryController.listCategories);
router.post("/", createCategoryValidator, validateRequest, categoryController.createCategory);
router.delete("/:id", validateObjectId("id"), categoryController.deleteCategory);

module.exports = router;
