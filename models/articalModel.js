import {Schema,model,Types} from 'mongoose'

const commentSchema=new Schema({
    user:{
        type:Types.ObjectId,
        ref:"user",
        required:[true,'user ID required']
    },
    comment:{
        type:String,
        required:[true,'Enter a Comment']
    }
})

const articleSchema=new Schema({
    author:{
        type:Types.ObjectId,
        ref:"user",
        required:[true,'author ID is required']
    },
    title:{
        type:String,
        required:[true,'titile required']
    },
    category:{
        type:String,
        required:[true,'category required']
    },
    content:{
        type:String,
        required:[true,'content is required']
    },
    comments:[{type:commentSchema,default:[]}],
    isArticleActive:{
        type:Boolean,
        default:true
    }
},
{
    versionKey:false,
    timestamps:true,
    strict:"throw"
})

export const articleModel=model("Article",articleSchema)