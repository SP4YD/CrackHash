const { Worker } = require('worker_threads');
const axios = require('axios');
const { MANAGER_URL, PATH_WORKER } = require("./config");

let requestQueue = [];
let requestMap = new Map();
let isWorkerActive = false;
let activeRequest = null;

const sharedBuffer = new SharedArrayBuffer(8);
const dataView = new DataView(sharedBuffer);

async function runWorker(request) {
    dataView.setFloat64(0, 0, true);
    const worker = new Worker(PATH_WORKER, { 
        workerData: { ...request, sharedBuffer } 
    });

    activeRequest = request.requestId;
    isWorkerActive = true;

    worker.on('message', async (message) => {
        const { requestId, answers } = message;
        requestMap.set(requestId, dataView.getFloat64(0, true));
        console.log(`(${requestId}) Task completed with answer { ${answers} }`);
        
        sendAnswer(requestId, answers);
    });

    worker.on('error', (error) => {
        console.error(`Error: ${error.message}`);
    });

    worker.on('exit', (code) => {
        requestMap.set(activeRequest, dataView.getFloat64(0, true));
        isWorkerActive = false;
        activeRequest = null;

        if (code !== 0) {
            console.error(`Worker finished with code: ${code}`);
        }

        if (requestQueue.length) {
            runWorker(requestQueue.shift());
        }
    });
}

function addTask(req, res) {
    const request = req.body;
    console.log(`(${request.requestId}) Received a new request from the manager`);

    if (!isWorkerActive && requestQueue.length === 0) {
        runWorker(request);
    } else {
        requestQueue.push(request);
    }
    requestMap.set(request.requestId, 0);

    res.json({ message: 'Task accepted', requestId: request.requestId });
}

function getStatus(req, res) {
    const { requestId } = req.query;

    if (requestMap.has(requestId)) {
        if (requestId === activeRequest) {
            requestMap.set(requestId, dataView.getFloat64(0, true));
        }
        res.json({ 
            requestId, 
            status: requestMap.get(requestId) 
        });
    } else {
        res.status(400).json({ error: "Invalid requestID" });
    }
}

async function sendAnswer(requestId, answers) {
    try {
        await axios.patch(`${MANAGER_URL}/internal/api/manager/hash/crack/request`, { 
            requestId, 
            answers 
        });
    } catch (error) {
        console.error("Failed to send result to Manager", error);
    }
}

module.exports = { addTask, getStatus };
