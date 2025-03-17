require("dotenv").config();

const PORT = process.env.PORT || 3000;
const MANAGER_PORT = process.env.MANAGER_PORT || 5000;
const MANAGER_URL = `http://manager:${MANAGER_PORT}`;
const PATH_WORKER = __dirname + "/worker.js";

module.exports = { PORT, MANAGER_URL, PATH_WORKER };
