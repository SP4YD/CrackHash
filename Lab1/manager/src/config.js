require("dotenv").config();

const PORT = process.env.PORT || 5000;
const TIMEOUT = process.env.TIMEOUT || 300000;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const NUMBER_WORKERS = process.env.NUMBER_WORKERS || 3;
const WORKER_PORT = process.env.WORKER_PORT || 3000;
const WORKERS_URL = Array.from({ length: NUMBER_WORKERS }, (_, i) => `http://worker_${i + 1}:${WORKER_PORT}`);

const REQ_STATUSES = Object.freeze({
    IN_PROGRESS: "IN_PROGRESS",
    ERROR: "ERROR",
    READY: "READY",
    PARTIALLY_READY: "PARTIALLY_READY"
});

module.exports = { PORT, TIMEOUT, ALPHABET, WORKERS_URL, REQ_STATUSES };
