const express = require('express');
const { addTask, getStatus } = require('./services');

const router = express.Router();

router.post("/internal/api/worker/hash/crack/task", addTask);
router.get("/internal/api/worker/hash/crack/status", getStatus);

module.exports = router;