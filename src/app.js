import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser( ))

//Routes import

import userRouter from './routes/user.routes.js'

// Routes declaration 
// ( we will not use app.get as we are not writings controllers routers evrything in same file )
// so we will be using it like a middleware

app.use("/api/v1/users",userRouter) // we are writing this api/v1 as it is a standard practice to write api then version and all(good practice)
//  this route will be prefixed before rote in router http://localhost:8000/api/v1/users/register

export { app }