const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const http = require('http')
const PORT = 8000
const server = http.createServer(app)
//express middleware
app.use(express.json())
app.use(cookieParser())
app.listen(PORT , ()=> console.log(`app is running on port ${PORT}`))