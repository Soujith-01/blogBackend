import exp from 'express'
import {verifyToken} from '../middlewares/verifyToken.js'
import {articleModel} from '../models/articalModel.js'
export const userApp=exp.Router()

//Read articles of all authors
userApp.get('/articles',verifyToken("USER"),async(req,res)=>{
    //read articles
    const articlesList=await articleModel.find({isArticleActive:true})
    //send res
    res.status(200).json({message:'articlesList',payload:articlesList})
})


//add comment to an article
userApp.put('/articles',verifyToken('USER'),async(req,res)=>{
    //get body from request
    const {articleId,comment}=req.body
    //check article
    const articleDoc=await articleModel.findOne({_id:articleId,isArticleActive:true})
    //if article not found
    if(!articleDoc){
        return res.status(404).json({message:'Article not found'})
    }
    //get user id
    const userId=req.user?.id
    //add comment to commets array of articleDoc
    articleDoc.comments.push({user:userId,comment:comment})
    //save
    await articleDoc.save()
    await articleDoc.populate("comments.user")
    //send res
    res.status(200).json({message:'Comment added successfully',payload:articleDoc})
})
