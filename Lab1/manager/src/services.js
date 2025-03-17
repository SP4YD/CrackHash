const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { REQ_STATUSES, WORKERS_URL, TIMEOUT, ALPHABET } = require("./config");

const requests = new Map();

function splitLoad(total, partsCount) {
    const baseValue = Math.floor(total / partsCount);
    const remainder = total % partsCount;

    const result = new Array(partsCount).fill(baseValue);

    for (let i = 0; i < remainder; i++) {
        result[i]++;
    }

    return result;
}

async function createCrackRequest(req, res) {
    const { hash, maxLength } = req.body;
    if (!hash || !maxLength) {
        return res.status(400).json({ error: "Invalid input" });
    }

    const requestId = uuidv4();
    requests.set(requestId, { 
        status: REQ_STATUSES.IN_PROGRESS, 
        data: null, 
        expectedWorkers: WORKERS_URL.length 
    });

    console.log(`(${requestId}) Received a request from a user`);

    const workLoad = splitLoad(ALPHABET.length, WORKERS_URL.length);
    let offsetAlphabet = 0;

    for (let i = 0; i < WORKERS_URL.length; i++) {
        await sendTaskToWorker(i, { 
            requestId, 
            partNumber: offsetAlphabet, 
            partCount: workLoad[i], 
            hash, 
            maxLength, 
            alphabet: ALPHABET 
        });
        
        offsetAlphabet += workLoad[i];
    }

    setTimeout(() => {
        const request = requests.get(requestId);
        if (request && request.status === REQ_STATUSES.IN_PROGRESS) {
            console.log(`(${requestId}) Request waiting timeout is up`);
            if (request.data) {
                requests.set(requestId, { status: REQ_STATUSES.PARTIALLY_READY, data: requests.data });
            } else {
                requests.set(requestId, { status: REQ_STATUSES.ERROR, data: null });
            }
        }
    }, TIMEOUT);

    res.json({ requestId });
}

async function getStatus(req, res) {
    const { requestId } = req.query;
    console.log(`(${requestId}) Received a status request`);

    const request = requests.get(requestId);
    if (!request) {
        return res.status(404).json({ error: "Request not found" });
    }

    if (request.status === REQ_STATUSES.IN_PROGRESS) {
        let totalPercentage = 0;

        for (const workerUrl of WORKERS_URL) {
            totalPercentage += await getWorkerStatus(workerUrl, requestId);
        }

        totalPercentage = (totalPercentage * 100) / WORKERS_URL.length;
        res.json({ 
            status: request.status, 
            data: request.data, 
            percentage: totalPercentage.toFixed(2) + '%' 
        });
    } else {
        res.json({ 
            status: request.status, 
            data: request.data 
        });
    }
}

function updateRequest(req, res) {
    const { requestId, answers } = req.body;
    console.log(`(${requestId}) Worker response: { ${answers} }`);

    if (!requests.has(requestId)) {
        return res.status(404).json({ error: "Request not found" });
    }

    const request = requests.get(requestId);
    request.expectedWorkers--;

    if (answers) {
        if (!request.data) {
            request.data = [answers];
        } else {
            request.data.push(answers);
        }
    }

    if (request.expectedWorkers === 0 && request.status === REQ_STATUSES.IN_PROGRESS) {
        request.status = REQ_STATUSES.READY;
    }

    requests.set(requestId, request);
    res.json({ status: "updated" });
}

async function sendTaskToWorker(workerIndex, data) {
    try {
        await axios.post(WORKERS_URL[workerIndex] + "/internal/api/worker/hash/crack/task", data);
    } catch (error) {
        console.error(`Failed to send task to worker ${workerIndex}`, error);
    }
}

async function getWorkerStatus(workerUrl, requestId) {
    try {
        const response = await axios.get(workerUrl + "/internal/api/worker/hash/crack/status", { 
            params: { requestId } 
        });
        return response.data?.status || 0;
    } catch (error) {
        console.error(`Failed to get status from worker ${workerIndex}`, error);
        return 0;
    }
}

module.exports = { createCrackRequest, getStatus, updateRequest };
