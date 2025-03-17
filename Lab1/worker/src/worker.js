const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

let answers = [];
let numberWordsReviewed = 0;
let numberWords = 0;

function calcNumberWords(alphabet, maxLength, countSymbol) {
    for (let i = 1; i <= maxLength; i++) {
        numberWords += Math.pow(alphabet.length, maxLength - i) * countSymbol
    }
}

function searchForWords(hash, alphabet, maxLength, start, countSymbol) {
    let stack = [''];

    while (stack.length > 0) {
        let currentWord = stack.pop();

        if (currentWord.length > 0) {
            numberWordsReviewed++;
            dataView.setFloat64(0, numberWordsReviewed / numberWords, true);

            const currentHash = crypto.createHash('md5').update(currentWord).digest('hex');
            if (currentHash === hash) {
                answers.push(currentWord);
            }
        }

        if (currentWord.length < maxLength) {
            if (currentWord.length === 0) {
                for (let i = start; i < start + countSymbol; i++) {
                    stack.push(currentWord + alphabet[i]);
                }
            } else {
                for (let i = alphabet.length - 1; i >= 0; i--) {
                    stack.push(currentWord + alphabet[i]);
                }
            }
        }
    }

    return answers;
}

const { 
    requestId, 
    partNumber, 
    partCount, 
    hash, 
    maxLength, 
    alphabet,
    sharedBuffer,
} = workerData;
const dataView = new DataView(sharedBuffer);

calcNumberWords(alphabet, maxLength, partCount);

searchForWords(hash, alphabet, maxLength, partNumber, partCount);

if (answers.length) {
    parentPort.postMessage({
        requestId,
        answers
    });
} else {
    parentPort.postMessage({
        requestId,
        answers: null
    });
}