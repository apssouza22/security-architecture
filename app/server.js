const express = require('express');
const app = express();
app.get('/', (req, res) => {
    res.send('Hello World! This is a protected service.');
})
app.listen(7000, () => console.log('Server is up and running'));
