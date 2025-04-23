import express from 'express'
import routes from './routes.js'
import { PORT } from './config.js'
import connectToMongo from './database.js'
import { connectRabbit } from './rabbitMQ/rabbit.js'
import { resendPendingTasks } from './services.js'

setTimeout(async () => {
  const app = express()
  app.use(express.json())
  app.use(routes)
  app.listen(PORT, () => {
    console.log(`Manager server running on port ${PORT}`)
  })

  await connectToMongo()

  connectRabbit()

  setInterval(() => {
    resendPendingTasks()
  }, 3 * 1000)
}, 10000)
