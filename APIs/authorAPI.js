import exp from 'express'
import { userModel } from '../models/userModel.js'
import { articleModel } from '../models/articalModel.js'
import { userApp } from './userAPI.js'
import { verifyToken } from '../middlewares/verifyToken.js'
export const authorApp=exp.Router()

// create new article
authorApp.post('/article',verifyToken("AUTHOR"),async(req,res)=>{
    //get articleObj from body
    const articleObj=req.body
    let user=req.user
    //verify author
    let author=await userModel.findById(articleObj.author)
    if(!author){
        return res.status(404).json({message:"invalid author"})//authentication
    }
    if(author.email!=user.email){
        return res.status(403).json({message:"you are not authorized"})
    }

    //create article document
    const articleDoc=await articleModel(articleObj)
    //save article
    await articleDoc.save()
    //send responsee
    res.status(201).json({message:"article published"})
})


//read own articles
authorApp.get('/articles',verifyToken("AUTHOR"),async(req,res)=>{
    //read authorId from user req 
    let autherIdOfToken=req.user?.id
    const articlesList=await articleModel.find({author:autherIdOfToken})
    res.status(200).json({message:"articles",payload:articlesList})
})

//edit article
authorApp.put('/articles',verifyToken("AUTHOR"),async(req,res)=>{
    //get author id from req
    let authorId=req.user?.id
    //get modified article 
    const {articleId,title,category,content}=req.body
    const updatedDoc=await articleModel.findOneAndUpdate({_id:articleId,author:authorId},{$set:{title,category,content}},{new:true})
    //if either article id or author not correct
    if(!updatedDoc){
        return res.status(403).json({message:"you are not authorized to edit"})
    }
    //send res
    res.status(200).json({message:"article updated",payload:updatedDoc})
})

//delete article(soft)
authorApp.patch('/articles',verifyToken("AUTHOR"),async(req,res)=>{
    //get authorid from decoded token
    const authorId=req.user?.id
    //get modified article from body
    const {articleId,isArticleActive}=req.body
    //get article by id
    const articleOfDB=await articleModel.findOne({_id:articleId,author:authorId})
    if(!articleOfDB){
        return res.status(404).json({message:"article not found"})
    }
    //check status
    if(isArticleActive===articleOfDB.isArticleActive){
        return res.status(200).json({message:"article already in same status",payload:articleOfDB})
    }
    articleOfDB.isArticleActive=isArticleActive
    await articleOfDB.save()
    //send res
    res.status(200).json({message:"article",payload:articleOfDB})
})