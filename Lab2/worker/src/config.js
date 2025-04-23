import 'dotenv/config'

const PATH_WORKER = new URL('./worker.js', import.meta.url)

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

export { PATH_WORKER, EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY }
