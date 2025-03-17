const express = require('express');
const routes = require('./routes');
const { PORT } = require("./config");

const app = express();
app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
    console.log(`Worker is running on port ${PORT}`);
});