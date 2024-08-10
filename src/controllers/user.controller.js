import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { trusted } from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return {accessToken, refreshToken}

    } catch (error){
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username,email
    // check for images, check for avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token fiels from response
    // check for user creation
    // return response

    const { fullname, email, username, password } = req.body

    //validation - not empty
    if ([fullname, email, username, password].some((field) =>
        field?.trim() == "")) {
        throw new ApiError(400, "All fields are require")
    }

    // console.log(req.body)

    //check if user already exist

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    // console.log("existedUser:", existedUser)

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    } 

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Error while uploading on cloudinary file is required")
    }
    
    //  create user object - create an entry in db
    const user = await User.create({
        fullName: fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // Todos
    // get details of user from frontend => req body
    // username or email
    // password check
    // create refreshtoken and accesstoken
    // send them to user via cookies

    const {email, username, password} = req.body

    if (!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });
    
    if (!user) {
        throw new ApiError(404, "user not found username or email is incorrect")
    }

    const isPasswordValid = await user.isPasswordCorrect(password).then((docs) => {
        console.log("valid :", docs);
        return docs;
    }).catch((err) => {
        console.log(err);
    });
    

    console.log("Pass",isPasswordValid)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    console.log(accessToken)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
           },
            "User logged In successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findOneAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        })

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAcesssToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accesstoken",accessToken, options)
        .cookie("refreshToken",newRefreshToken,options)
        .json( new ApiResponse(  200,
            {accessToken, refreshToken: newRefreshToken},
            "Access Token Refreshed")
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "Current User fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    
    // const fullName =req.user?.fullName
    // const email = req.user?.email

    const {email, fullName} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "At least one field is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated successfully"))
})

const updateAvatar = asyncHandler(async(req,res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiResponse(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiResponse(400, "Error while uploading the file on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {avatar:avatar.url}
        },
        {
            new:true
        })

        return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async(req,res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiResponse(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiResponse(400, "Error while uploading the file on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {coverImage:coverImage.url}
        },
        {
            new:true
        })

        return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res) => {

    const username = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: username?.toLowerCase()
        },
        {
            $lookup :{
                from: "subscriptions",
                localField: "_id",
                foreignField:"channel",
                as: "subscribers"
            } 
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1

            }
        }
    ])

    if (channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0],"User Channel fetched successfully")
    )
})

const getWatchHistory =asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id" ,
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch History fetched successfully"
        )
    )
})

export { registerUser,
         loginUser,
         logoutUser,
         refreshAcesssToken,
         changeCurrentPassword,
         getCurrentUser,
         updateAccountDetails,
         updateAvatar,
         updateCoverImage,
         getUserChannelProfile,
         getWatchHistory}
