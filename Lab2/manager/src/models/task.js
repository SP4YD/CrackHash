import mongoose from 'mongoose'
import { REQ_STATUSES } from '../config.js'

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: REQ_STATUSES,
    default: 'CREATED',
  },
  data: { type: Array, default: null },
  expectedWorkers: { type: Number },
  hash: { type: String },
  maxLength: { type: Number },
})

const Task = mongoose.model('Task', TaskSchema)

export default Task
