import { Worker } from 'worker_threads'
import { getChannel } from './rabbitMQ/rabbit.js'
import { PATH_WORKER, EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY } from './config.js'

let currentTask = null

const sharedBuffer = new SharedArrayBuffer(8)
const dataView = new DataView(sharedBuffer)

async function runWorker(channel, msg) {
  dataView.setFloat64(0, 0, true)

  const worker = new Worker(PATH_WORKER, { workerData: { sharedBuffer } })

  worker.postMessage(currentTask)
  console.log(`(${currentTask.taskId}) Start worker with task`)

  try {
    await channel.assertExchange(EXCHANGE_NAME.RESULT_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME.RESULT_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.RESULT_QUEUE, EXCHANGE_NAME.RESULT_EXCHANGE, ROUTING_KEY.RESULT)

    worker.on('message', result => {
      try {
        channel.publish(EXCHANGE_NAME.RESULT_EXCHANGE, ROUTING_KEY.RESULT, Buffer.from(JSON.stringify(result)), {
          persistent: true,
        })
        channel.ack(msg)
      } catch (error) {
        console.error('Error connecting to rabbit to send the result')
      }
      console.log(`(${currentTask.taskId}) Finish worker with answer = `, result)
      currentTask = null
    })

    worker.on('error', err => {
      console.error('Worker error:', err)
      try {
        channel.nack(msg, false, true)
      } catch (e) {
        console.error('Failed to nack message:', e)
      }
      currentTask = null
    })

    worker.on('exit', code => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`)
        channel.nack(msg, false, true)
        currentTask = null
      }
    })
  } catch (err) {
    console.error("Couldn't connect to rabbit to send answers")
    currentTask = null
    throw new Error('Error connect to rabbit')
  }
}

async function listenTaskRequests() {
  try {
    console.log('Start listenTaskRequests')
    const channel = await getChannel()
    await channel.assertExchange(EXCHANGE_NAME.TASK_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME.TASK_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.TASK_QUEUE, EXCHANGE_NAME.TASK_EXCHANGE, ROUTING_KEY.TASK)
    await channel.prefetch(1)

    await channel.consume(QUEUE_NAME.TASK_QUEUE, async msg => {
      if (msg) {
        currentTask = JSON.parse(msg.content.toString())
        console.log(`(${currentTask.taskId}) Received a new request from the manager, currentTask = `, currentTask)

        runWorker(channel, msg)
      }
    })
  } catch (error) {
    console.error("Couldn't connect to RabbitMQ to receive tasks:", error)
    setTimeout(() => listenTaskRequests(), 5000)
  }
}

async function listenStatusRequests() {
  try {
    console.log('Start listenStatusRequests')
    const channel = await getChannel()
    await channel.assertExchange(EXCHANGE_NAME.STATUS_REQ_EXCHANGE, 'fanout', { durable: true })
    const q = await channel.assertQueue('', { exclusive: true })
    await channel.bindQueue(q.queue, EXCHANGE_NAME.STATUS_REQ_EXCHANGE, '')

    await channel.consume(q.queue, async msg => {
      if (msg && currentTask) {
        try {
          console.log(`(${currentTask.taskId}) Received a request for the task status`)
          const content = msg.content.toString()
          const { taskId } = JSON.parse(content)

          let percentages = dataView.getFloat64(0, true) * 100
          if (currentTask.taskId !== taskId) {
            percentages = 0
          }

          const response = JSON.stringify({ taskId, percentages })
          channel.publish(EXCHANGE_NAME.STATUS_RES_EXCHANGE, ROUTING_KEY.STATUS_RES, Buffer.from(response), {
            persistent: true,
          })

          channel.ack(msg)
        } catch (err) {
          console.error('Error when processing the status request:', err)
          throw new Error('Error connect to rabbit')
        }
      }
    })
  } catch (error) {
    console.error("Couldn't connect to rabbit to receive status: ", error)
    setTimeout(() => listenStatusRequests(), 5000)
  }
}

export { listenTaskRequests, listenStatusRequests }
