import {Schema,model} from 'mongoose'

const userSchema=new Schema({
    firstName:{
        type:String,
        required:[true,'First name is mandatory']
    },
    lastName:{
        type:String
    },
    email:{
        type:String,
        required:[true,'Email required'],
        unique:[true,'Email already exists']
    },
    password:{
        type:String,
        required:[true,'Password required']
    },
    role:{
        type:String,
        enum:["USER","AUTHOR","ADMIN"],
        rquired:[true,"invalid role"]
    },
    profileImageUrl:{
        type:String
    },
    isUserActive:{ //for soft deleting 
        type:Boolean,
        default:true
    }
},
{
    timestamps:true,
    versionKey:false,
    strict:"throw"
}
)

export const userModel=model("user",userSchema)