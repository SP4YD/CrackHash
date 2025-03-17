const express = require("express");
const { createCrackRequest, getStatus, updateRequest } = require("./services");

const router = express.Router();

router.post("/api/hash/crack", createCrackRequest);
router.get("/api/hash/status", getStatus);
router.patch("/internal/api/manager/hash/crack/request", updateRequest);

module.exports = router;
