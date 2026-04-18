import exp from 'express'
import {config} from 'dotenv'
import {connect} from 'mongoose'
import dns from 'dns'
import { hash } from 'bcryptjs'
import { userApp } from './APIs/userAPI.js'
import { authorApp } from './APIs/authorAPI.js'
import { adminApp } from './APIs/adminAPI.js'
import { commonApp } from './APIs/commonAPI.js'
import { userModel } from './models/userModel.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
config()

// On some Windows/network setups Node's default DNS resolver fails Atlas SRV lookups.
// Forcing public resolvers avoids `querySrv ECONNREFUSED` and lets MongoDB connect.
dns.setServers(['8.8.8.8', '1.1.1.1'])

//create express app
const app=exp()

//enable cors
const allowedOrigins = new Set([
  // 'http://localhost:5173',
  'http://localhost:5174',
  // 'http://localhost:5175',
  // 'http://127.0.0.1:5173',
  // 'http://127.0.0.1:5174',
  // 'http://127.0.0.1:5175',
].filter(Boolean))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS blocked for origin ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}))

//add cookieParser
app.use(cookieParser())
//body parser middleware
app.use(exp.json())

//path level middlewares
app.use('/user-api',userApp)
app.use('/author-api',authorApp)
app.use('/admin-api',adminApp)
app.use('/auth',commonApp)

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()?.toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()

  if (!adminEmail || !adminPassword) {
    return
  }

  const hashedPassword = await hash(adminPassword, 12)
  await userModel.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || '',
        role: 'ADMIN',
        password: hashedPassword,
        isUserActive: true,
      },
      $setOnInsert: {
        email: adminEmail,
      },
    },
    { upsert: true, new: true }
  )
}

//connect db
const connectDB=async()=>{
    try{
        await connect(process.env.DB_URL)
        await ensureAdminUser()
        console.log('DB connected')
        //assign port
        const port=process.env.PORT || 3000
        app.listen(port,()=>console.log(`server listening in ${port}`))
    }catch(err){
      console.log(err)
    }
}

connectDB()

//to handle invalid path
app.use((req,res,next)=>{
    res.status(404).json({message:`path ${req.url} is invalid`})
})
//error handling middleware
app.use((err,req,res,next)=>{
    console.log(err)
    //ValidationError
    if(err.name=="ValidationError"){
        return res.status(400).json({message:"Error occured",error:err})
    }

    //CastError
    if(err.name=="CastError"){
        return res.status(400).json({message:"Error occured",error:err})
    }

    //server side error
    res.status(500).json({message:"error occured",error:err.message})
})


//Error handling middleware
app.use((err, req, res, next) => {
  console.log("Error name:", err.name);
  console.log("Error code:", err.code);
  console.log("Error cause:", err.cause);
  console.log("Full error:", JSON.stringify(err, null, 2));
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
  res.status(500).json({ message: "error occurred", error: "Server side error" });
});