import jwt from 'jsonwebtoken'
import {config} from 'dotenv'
const {verify}=jwt
config()

export const verifyToken=(...allowedRoles)=>{
    return (req,res,next)=>{
        try{      
            //get the token from cookie
            const token=req.cookies?.token
            //if token is invalid 
            if(!token){
                return res.status(401).json({message:'please login'})
            }
            //if token valid
            const decodedtoken=verify(token,process.env.SECRET_KEY)//returns error if token is invalid
            //check the role is same as role in decodedToken
            if(!allowedRoles.includes(decodedtoken.role)){
                return res.status(403).json({message:"you are not authorized"})
            }
            //attach encoded user to req
            //if decodedToken is not attached the request wont be able to know who sent the request
            req.user=decodedtoken
            next()
            }
        catch(err){
            res.status(401).json({message:'session expired. login again'})
    }
    }
}
