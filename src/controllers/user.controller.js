import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


// This is the method to generate new access and refresh Tokens

const generateAccessAndRefreshTokens = async (userId) => {

    try {
        // find a user with an id
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // storing the refreshToken in user document
        user.refreshToken = refreshToken;
        // and save the refreshToken without any validation
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(400, "Something went wrong while generating Access and Refresh Token");
    }

}

const registerUser = asyncHandler(async (req, res) => {

    // get user details from the frontend
    const { fullName, username, email, password } = req.body;

    // validation-not empty
    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are Required")
    }

    // check is user already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "email or username already exists");
    }

    // console.log(req.files)

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File Is Required");
    }

    // upload avatar and converImage to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // in user model avatar is required so we check for the avatar
    if (!avatar) {
        throw new ApiError(409, "Avatar File Is Required");
    }

    // create user object - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        // if there is coverImage take the url else set it as empty string
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refreshToken form response:
    // select lets you choose which fields should be included or excluded
    // A minus (-) sign means exclude, so here we are excluding the password and refreshToken
    // to protect user and avoid security issues
    // A plus (+) sign means include
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // checking for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {

    // data from req.body

    const { username, email, password } = req.body;

    // F || F = F
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // we are finding the user based on username or email
    // converting the user entered username to lowecase
    // because the momgodb stores the everything in lowercase
    const user = await User.findOne({
        $or: [{ username: username?.toLowerCase() }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // comparing the password with the method in user.model
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate access and refresh Tokens if password is valid
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // accesing the login info by excluding password and refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // by this cookies can only modified by the server
    const options = {
        httpOnly: true,
        secure: true
    }

    // storing the accessToken and refreshToken in cookies with options
    // implying that only server can make changes to the cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})


// we will get the req.user from the middleware verifyJWT
// which will valid the user login info
// to get the userinfo for logoutUser we are using the middleware verifyJWT
// and to check user is authenticated or not middleware will be useful
const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))

})

// This will be the endpoint when the accessToken expires and we need to
// make user in login and to generate the new acccess Token
// we use the refeshToken to generate the new pair of access and refreshToken
// by this user can stay in login state which improves the user experience
const refreshAccessToken = asyncHandler(async (req, res) => {

    // accessing the refresh Token from cookies and req.body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        // verifing the incomingRefreshToken with RefreshSecret
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // by this we can store the user info in user based on id
        // and we have all the user info fields 
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        // checking whether refresh Token in cookies is same as refresh Token
        // in databse

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is Expired or Used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        // generating the new tokens
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newrefreshToken },
                    "Access Token Refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

export { registerUser, 
    loginUser, 
    logoutUser,
    refreshAccessToken }