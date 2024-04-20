// require('dotenv').config({path: './env'})
import dotenv from "dotenv";
import connectDB from './db/index.js'
import { app } from "./app.js";

dotenv.config({
    path: '../.env'
})

connectDB()
.then( () => {
    app.on("error",(error) => {
        console.error("ERROR IS:", error)
    })
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is listning on PORT: ${process.env.PORT}`);
    })}) 
    .catch ((err) => {
        console.log("ERROR in connecting to the Databse :", err);

    })











































/*
import express from "express";
const app = express()

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        
        app.on("errroor",(error) => {
            console.error("ERRR:", error);
            throw error
        })

        app.listen(process.env.PORT, () =>{
            console.log(`app is listening on port : ${process.env.PORT}`)
        })
    } catch (error) 
    {
        console.error("ERROR",error)
        throw error
    }

})()

*/