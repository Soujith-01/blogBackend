import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { userModel } from '../models/userModel.js'
export const adminApp=exp.Router()

//read all users and authors
adminApp.get('/users',verifyToken("ADMIN"),async(req,res)=>{
    //users list (excluding authors/admin)
    const usersList=await userModel.find({role:'USER'},{password:0})
    //send res
    res.status(200).json({message:"Users",payload:usersList})
})

//read all authors
adminApp.get('/authors',verifyToken("ADMIN"),async(req,res)=>{
    const authorsList=await userModel.find({role:'AUTHOR'},{password:0})
    res.status(200).json({message:"Authors",payload:authorsList})
})

//BLOCK OR ACTIVATE USER OR AUTHOR
adminApp.patch('/users',verifyToken("ADMIN"),async(req,res)=>{
    //get user info from req body
    const {userId,isUserActive}=req.body
    //find user by userID
    const user=await userModel.findById(userId)
    //if user not present
    if(!user){
        return res.status(404).json({message:'user not found'})
    }
    //if he wanted to change admin cred
    if(user.role==="ADMIN"){
        return res.status(403).json({message:"cannot change Admin Role"})
    }
    //check status of user
    if(isUserActive===user.isUserActive){
        return res.status(200).json({message:"already User in same status"})
    }
    //update user active status
    user.isUserActive=isUserActive
    await user.save()
    //remove password
    const userDoc=user.toObject()
    delete userDoc.password
    //send res
    res.status(200).json({message:"user updated",payload:userDoc})
})