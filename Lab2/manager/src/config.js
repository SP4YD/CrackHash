import 'dotenv/config'

const PORT = process.env.PORT || 5000
const TIMEOUT = process.env.TIMEOUT || 300000
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const NUMBER_WORKERS = Number(process.env.NUMBER_WORKERS) || 3

const REQ_STATUSES = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  ERROR: 'ERROR',
  READY: 'READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  QUEUED: 'QUEUED',
  CREATED: 'CREATED',
})

const EXCHANGE_NAME = Object.freeze({
  RESULT_EXCHANGE: 'result_exchange',
  TASK_EXCHANGE: 'task_exchange',
  STATUS_REQ_EXCHANGE: 'status_req_exchange',
  STATUS_RES_EXCHANGE: 'status_res_exchange',
})

const QUEUE_NAME = Object.freeze({
  RESULT_QUEUE: 'result_queue',
  TASK_QUEUE: 'task_queue',
  STATUS_REQUEST_QUEUE: 'status_request_queue',
  STATUS_RESPONSE_QUEUE: 'status_response_queue',
})

const ROUTING_KEY = Object.freeze({
  RESULT: 'result',
  TASK: 'task',
  STATUS_REQ: 'status_req',
  STATUS_RES: 'status_res',
})

export { PORT, TIMEOUT, ALPHABET, NUMBER_WORKERS, REQ_STATUSES, EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY }
