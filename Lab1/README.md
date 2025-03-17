# CrackHash — распределенная система для взлома MD5 хэша

## Описание  

**CrackHash** — это распределенная система для перебора MD5-хэшей методом brute-force. Система состоит из **менеджера** и **воркеров**, взаимодействующих через REST API.  
Менеджер принимает запросы, распределяет задачи между воркерами, собирает результаты и предоставляет их клиенту.  

## Технологии  

- **Node.js** (чистый JS)  
- **Express** — REST API  
- **Dotenv** — управление конфигурацией  
- **Worker_threads** — многопоточная обработка  
- **Crypto** — вычисление MD5  
- **Axios** — HTTP-запросы между сервисами  
- **Uuid** — генерация уникальных идентификаторов  

## Структура проекта  
```
Lab1/
│
├── manager/              
│   ├── src/
│   │   ├── config.js     
│   │   ├── index.js      
│   │   ├── routes.js     
│   │   └── services.js   
│   ├── .env              
│   ├── .env.example      
│   ├── Dockerfile       
│   ├── package.json      
│   └── package-lock.json
│
├── worker/              
│   ├── src/
│   │   ├── config.js
│   │   ├── index.js
│   │   ├── routes.js
│   │   ├── services.js
│   │   └── worker.js      
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml     
└── README.md              
```

## Документация
### Установка  

1. **Клонирование репозитория:**  
    ```sh
    git clone https://github.com/SP4YD/CrackHash.git
    cd Lab1
    ```
2. **Установка зависимостей для менеджера и воркера:**
    ```sh
    cd ./worker
    npm install
    cd ..
    cd ./manager
    npm install
    ```
3. **Настройка переменных окружения:**

    Создайте .env файлы в manager/ и worker/, используя .env.example как шаблон.
4. **Запуск и сборка сервисов из папки Lab1:**
    ```sh
    docker-compose up --build
    ```
5. **Для запуска без сборки используйте:**
    ```sh
    docker-compose up
    ```

## API
### 1. Взлом хэша
Отправка задачи на взлом MD5-хэша.
#### Запрос:
```
POST /api/hash/crack
Content-Type: application/json
```
Body:
```
{
    "hash": "e2fc714c4727ee9395f324cd2e7f331f",
    "maxLength": 5
}
```
#### Ответ:
```
{
    "requestId": "0baf6274-164e-49f2-89c3-279e60d2adeb"
}
```
### 2. Проверка статуса задачи
Получение статуса текущей задачи.
#### Запрос:
```
GET /api/hash/status?requestId=0baf6274-164e-49f2-89c3-279e60d2adeb
```
#### Ответ (если задача в процессе):
```
{
    "status": "IN_PROGRESS",
    "data": null,
    "percentage": "52.03%"
}
```
#### Ответ (если задача завершена):
```
{
    "status": "READY",
    "data": ["abcd"]
}
```

## Как работает распределение задач?  

- **Менеджер** принимает задачу и делит диапазон перебора между **воркерами**.  
- Каждый **воркер** вычисляет MD5 для своей части и отправляет результаты менеджеру.  
- Когда все воркеры отработали, менеджер фиксирует результат и отдает клиенту.  