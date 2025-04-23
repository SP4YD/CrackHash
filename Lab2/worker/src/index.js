import { connectRabbit } from './rabbitMQ/rabbit.js'

setTimeout(async () => {
  connectRabbit()
}, 10000)
