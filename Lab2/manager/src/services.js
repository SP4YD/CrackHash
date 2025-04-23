import { v4 as uuidv4 } from 'uuid'
import { REQ_STATUSES, NUMBER_WORKERS, TIMEOUT, ALPHABET, EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEY } from './config.js'
import { getChannel } from './rabbitMQ/rabbit.js'
import Task from './models/task.js'

// Разделяет нагрузку на части
function splitLoad(total, partsCount) {
  const baseValue = Math.floor(total / partsCount)
  const remainder = total % partsCount

  const result = new Array(partsCount).fill(baseValue)

  for (let i = 0; i < remainder; i++) {
    result[i]++
  }

  return result
}

// Создает подзадачи для воркеров
function createTasks(taskId, hash, maxLength) {
  const workLoad = splitLoad(ALPHABET.length, NUMBER_WORKERS)
  let offsetAlphabet = 0
  let tasks = []

  for (let i = 0; i < NUMBER_WORKERS; i++) {
    tasks.push({
      taskId,
      partNumber: offsetAlphabet,
      partCount: workLoad[i],
      hash,
      maxLength,
      alphabet: ALPHABET,
    })

    offsetAlphabet += workLoad[i]
  }

  return tasks
}

// Отправка задачи воркеру
async function sendTaskToWorker(channel, data) {
  try {
    channel.publish(EXCHANGE_NAME.TASK_EXCHANGE, ROUTING_KEY.TASK, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    })
    await Task.findOneAndUpdate({ taskId: data.taskId }, { status: REQ_STATUSES.IN_PROGRESS })
  } catch (error) {
    console.error(`Failed to send task to RabbitMQ`)
    throw new Error('Failed to send task to RabbitMQ')
  }
}

// Функция для ожидания и обновления статуса таски по таймауту
async function handleTimeout(taskId) {
  setTimeout(async () => {
    const task = await Task.findOne({ taskId: taskId })
    if (task && task.status === REQ_STATUSES.IN_PROGRESS) {
      console.log(`(${taskId}) Request waiting timeout is up`)
      if (task.data) {
        await Task.findOneAndUpdate({ taskId: taskId }, { status: REQ_STATUSES.PARTIALLY_READY })
      } else {
        await Task.findOneAndUpdate({ taskId: taskId }, { status: REQ_STATUSES.ERROR, data: null })
      }
    }
  }, TIMEOUT)
}

// Принимает запросы на создание таски
async function requestToCreateTask(req, res) {
  const { hash, maxLength } = req.body
  if (!hash || !maxLength) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  const taskId = uuidv4()
  const newTask = new Task({
    taskId,
    status: REQ_STATUSES.CREATED,
    data: null,
    expectedWorkers: NUMBER_WORKERS,
    hash,
    maxLength,
  })

  try {
    await newTask.save()
    console.log(`(${taskId}) Received a request from a user`)

    const tasks = createTasks(taskId, hash, maxLength)
    const channel = await getChannel()
    await channel.assertExchange(EXCHANGE_NAME.TASK_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME.TASK_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.TASK_QUEUE, EXCHANGE_NAME.TASK_EXCHANGE, ROUTING_KEY.TASK)

    for (const task of tasks) {
      sendTaskToWorker(channel, task)
    }

    handleTimeout(taskId)

    res.json({ taskId })
  } catch (error) {
    await Task.findOneAndUpdate({ taskId }, { status: REQ_STATUSES.QUEUED })
    console.error(`(${taskId}) Error while creating task`)
    res.status(500).json({ taskId, error: "Couldn't send task to queue" })
  }
}

/// Получение статуса таски
async function getStatus(req, res) {
  const { taskId } = req.query
  console.log(`(${taskId}) Received a status request`)

  try {
    const task = await Task.findOne({ taskId: taskId })
    if (!task) {
      return res.status(404).json({ error: 'Request not found' })
    }

    if (task.status === REQ_STATUSES.IN_PROGRESS) {
      let totalPercentage = 0
      const percentages = await requestStatus(taskId)

      for (const percentage of percentages) {
        totalPercentage += Number(percentage)
      }

      totalPercentage = totalPercentage / NUMBER_WORKERS
      res.json({
        status: task.status,
        data: task.data,
        percentage: totalPercentage.toFixed(2) + '%',
      })
    } else {
      res.json({
        status: task.status,
        data: task.data,
      })
    }
  } catch (error) {
    console.error(`(${taskId}) Error while getting status`)
    res.status(503).json({ error: "Couldn't find out the status" })
  }
}

// Принимает результаты таски от воркеров
async function consumeResults() {
  try {
    const channel = await getChannel()
    await channel.assertExchange(EXCHANGE_NAME.RESULT_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME.RESULT_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.RESULT_QUEUE, EXCHANGE_NAME.RESULT_EXCHANGE, ROUTING_KEY.RESULT)

    await channel.consume(QUEUE_NAME.RESULT_QUEUE, async msg => {
      if (msg) {
        try {
          const content = msg.content.toString()
          const { taskId, answers } = JSON.parse(content)
          console.log(`(${taskId}) Worker response: { ${answers} }`)

          const exists = await Task.exists({ taskId: taskId })
          if (!exists) {
            return res.status(404).json({ error: 'Request not found' })
          }

          const task = await Task.findOne({ taskId: taskId })
          task.expectedWorkers--

          if (answers.length) {
            if (!task.data) {
              task.data = answers
            } else {
              task.data.push(...answers)
            }
          }

          if (task.expectedWorkers === 0 && task.status === REQ_STATUSES.IN_PROGRESS) {
            task.status = REQ_STATUSES.READY
          }

          await Task.findOneAndUpdate(
            { taskId: taskId },
            { data: task.data, status: task.status, expectedWorkers: task.expectedWorkers }
          )

          channel.ack(msg)
        } catch (err) {
          console.error('Error when processing the result:', err)
          channel.nack(msg, false, false)
        }
      }
    })
  } catch (error) {
    console.error("Couldn't connect to rabbit to receive a answer")
    setTimeout(() => consumeResults(), 5000)
  }
}

// Получение статуса выполнения от воркеров
async function requestStatus(taskId) {
  try {
    const channel = await getChannel()
    await channel.assertExchange(EXCHANGE_NAME.STATUS_REQ_EXCHANGE, 'fanout', { durable: true })
    await channel.assertQueue(QUEUE_NAME.STATUS_REQUEST_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.STATUS_REQUEST_QUEUE, EXCHANGE_NAME.STATUS_REQ_EXCHANGE, '')

    const request = { taskId }
    channel.publish(EXCHANGE_NAME.STATUS_REQ_EXCHANGE, '', Buffer.from(JSON.stringify(request)), {
      persistent: true,
    })

    await channel.assertExchange(EXCHANGE_NAME.STATUS_RES_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME.STATUS_RESPONSE_QUEUE, { durable: true })
    await channel.bindQueue(QUEUE_NAME.STATUS_RESPONSE_QUEUE, EXCHANGE_NAME.STATUS_RES_EXCHANGE, ROUTING_KEY.STATUS_RES)

    const collected = []
    const consumeTag = await channel.consume(QUEUE_NAME.STATUS_RESPONSE_QUEUE, msg => {
      if (msg) {
        const response = JSON.parse(msg.content.toString())
        if (response.taskId === taskId) {
          collected.push(response.percentages)
        }
        channel.ack(msg)
      }
    })

    await new Promise(res => setTimeout(res, 2000))

    await channel.cancel(consumeTag.consumerTag)
    return collected
  } catch (error) {
    console.error(`(${taskId}) Error while requesting status`)
    throw new Error('Failed to request status from workers')
  }
}

// Переотправка незавершенных задач
async function resendPendingTasks() {
  const unsentTasks = await Task.find({ status: REQ_STATUSES.QUEUED }).exec()

  if (unsentTasks.length) {
    try {
      const channel = await getChannel()
      await channel.assertExchange(EXCHANGE_NAME.TASK_EXCHANGE, 'direct', { durable: true })
      await channel.assertQueue(QUEUE_NAME.TASK_QUEUE, { durable: true })
      await channel.bindQueue(QUEUE_NAME.TASK_QUEUE, EXCHANGE_NAME.TASK_EXCHANGE, ROUTING_KEY.TASK)

      for (const task of unsentTasks) {
        console.log(`Resending task ${task.taskId}`)
        const newTasks = createTasks(task.taskId, task.hash, task.maxLength)
        for (const newTask of newTasks) {
          sendTaskToWorker(channel, newTask)
        }
      }
    } catch (error) {
      console.error('Error while resending tasks')
    }
  }
}

export { requestToCreateTask, getStatus, consumeResults, resendPendingTasks }
