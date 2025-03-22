const express = require("express");
const router = express.Router();
const authController = require("../controllers/AuthController");
const signUpValidator = require("../validators/signUpValidator");

router.post("/sign-up", signUpValidator, authController.signUp);
router.post("/login", authController.login);
router.post("/guest", authController.guest);
router.post("/pre-register-check", authController.preRegister);
router.get("/show-users", authController.getAll);

module.exports = router;
