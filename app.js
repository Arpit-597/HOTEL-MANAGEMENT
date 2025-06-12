const express = require("express")
const app = express()

const web = require("./routes/web")
require("dotenv").config()
const setUserInfo = require('./middlewares/setUserInfo')


app.set("view engine", "ejs")

app.use(express.static('public'))

app.use(express.urlencoded())
app.use(express.json())


const connectDb = require('./database/dbcon')
connectDb()


const flash = require("connect-flash")
const session = require("express-session")

// Messages
app.use(session({
    secret:'secret',
    cookie:{maxAge:60000},
    resave:false,
    saveUninitialized:false,
}));
// Flash messages
app.use(flash())

const cookieParser = require("cookie-parser")
// token get cookies
app.use(cookieParser())
app.use(setUserInfo)

const fileUpload = require("express-fileupload")
// image upload form se controller ke paas jaati hai
app.use(fileUpload({
    useTempFiles : true,
    // tempFileDir : '/tmp/'
}));


app.use('/',web)
app.listen(process.env.PORT,() =>{
    console.log(`server start localhost:${process.env.PORT}`)
})