import exp from 'express'
import  {config} from 'dotenv'
import {connect} from 'mongoose'
import dns from 'dns'
import {userApp} from "./APIs/userAPI.js"
import {authorApp} from "./APIs/authorAPI.js"
import {adminApp} from "./APIs/adminAPI.js"
import {commonApp} from "./APIs/commonAPI.js"
import cookiParser from "cookie-parser"
import cors from "cors";
config()

// On some Windows/network setups default DNS can't resolve Atlas SRV records reliably.
dns.setServers(['8.8.8.8', '1.1.1.1'])

const app = exp()
app.set('trust proxy', 1)

const envOrigins = `${process.env.FRONTEND_URL || ''},${process.env.FRONTEND_URLS || ''}`
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://blog-frontend-e041d.netlify.app',
  ...envOrigins,
])

//add cors middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked for origin ${origin}`))
    },
    credentials: true
  }),
);
// body parser middleware
app.use(exp.json());
// cookie parser middleware
app.use(cookiParser())
// path level middlewares
app.use("/user-api",userApp)
app.use("/author-api",authorApp)
app.use("/admin-api",adminApp)
app.use("/auth",commonApp)
// connect to db
const connectDB = async()=> {
    try {
        await connect(process.env.DB_URL)
        console.log("Db connected")
        // assign port
        const port = process.env.PORT || 5000
        app.listen(port,()=>console.log(`server listening on ${port} `))
    }catch(err){
        console.log("err in db connect",err)
    }
}

connectDB()

// to handle invalid path
app.use((req,res,next)=>{
    console.log(req.url)
    res.status(404).json({message:`Path ${req.url} is invalid`})
})

//Error handling middleware
app.use((err, req, res, next) => {
  // console.log("Error name:", err.name);
  // console.log("Error code:", err.code);
  // console.log("Error cause:", err.cause);
  // console.log("Full error:", JSON.stringify(err, null, 2));
  console.log(err)
  //ValidationError
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  //CastError
  if (err.name === "CastError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = Object.keys(keyValue)[0];
    const value = keyValue[field];
    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`,
    });
  }

  //send server side error
  res.status(500).json({ message: "error occurred", error: err.body });
});