import { parentPort, workerData } from 'worker_threads'
import crypto from 'crypto'

function calcNumberWords(alphabet, maxLength, countSymbol) {
  let numberWords = 0
  for (let i = 1; i <= maxLength; i++) {
    numberWords += Math.pow(alphabet.length, maxLength - i) * countSymbol
  }

  return numberWords
}

function searchForWords(hash, alphabet, maxLength, start, countSymbol, numberWords) {
  let stack = ['']
  let answers = []
  let numberWordsReviewed = 0

  while (stack.length > 0) {
    let currentWord = stack.pop()

    if (currentWord.length > 0) {
      numberWordsReviewed++
      dataView.setFloat64(0, numberWordsReviewed / numberWords, true)

      const currentHash = crypto.createHash('md5').update(currentWord).digest('hex')
      if (currentHash === hash) {
        answers.push(currentWord)
      }
    }

    if (currentWord.length < maxLength) {
      if (currentWord.length === 0) {
        for (let i = start; i < start + countSymbol; i++) {
          stack.push(currentWord + alphabet[i])
        }
      } else {
        for (let i = alphabet.length - 1; i >= 0; i--) {
          stack.push(currentWord + alphabet[i])
        }
      }
    }
  }

  return answers
}

function startCalculations(currentTask) {
  const { taskId, partNumber, partCount, hash, maxLength, alphabet } = currentTask

  const numberWords = calcNumberWords(alphabet, maxLength, partCount)

  const answers = searchForWords(hash, alphabet, maxLength, partNumber, partCount, numberWords)

  return { taskId, answers }
}

const { sharedBuffer } = workerData
const dataView = new DataView(sharedBuffer)

parentPort.on('message', currentTask => {
  const result = startCalculations(currentTask)
  parentPort.postMessage(result)
})
