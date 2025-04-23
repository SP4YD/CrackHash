import express from 'express'
import { requestToCreateTask, getStatus, resendPendingTasks } from './services.js'

const router = express.Router()

router.post('/api/hash/crack', requestToCreateTask)
router.get('/api/hash/status', getStatus)

export default router
