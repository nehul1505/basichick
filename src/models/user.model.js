import mongoose from "mongoose";
import { Jwt } from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username:{
            type:String,
            required: true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required: true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullName:{
            type:String,
            required: true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,     //cloudinary
            required: true,
        },
        coverImage:{
            type:String, //cloudinary
        },
        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password:{
            type:String,
            required: [true, 'password is required']
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps:true
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) 
{
    return await bcrypt.compare(password,this.password)
}


userSchema.method.generateAccessToken = funtion()
{
    return Jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.method.generateRefreshToken = funtion () 
{
    return jwt.sign(
        {
            _id:this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

export const User = mongoose.model("User",userSchema) 