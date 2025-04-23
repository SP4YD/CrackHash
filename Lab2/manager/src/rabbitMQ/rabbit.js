import amqp from 'amqplib'
import { consumeResults } from '../services.js'

let channel = null

export async function connectRabbit() {
  try {
    const connection = await amqp.connect('amqp://user:pass@rabbitmq')

    connection.on('close', () => {
      console.error('RabbitMQ connection closed')
      setTimeout(() => connectRabbit(), 3000)
    })

    connection.on('error', err => {
      console.error('RabbitMQ connection error')
      setTimeout(() => connectRabbit(), 3000)
    })

    channel = await connection.createChannel()
    console.log('Connected to RabbitMQ successfully.')

    await consumeResults()
  } catch (err) {
    console.error('Failed to connect to RabbitMQ')
    setTimeout(() => connectRabbit(), 5000)
  }
}

export function getChannel() {
  return channel
}
