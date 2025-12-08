import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


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
    const coverImageLocalPath =  req.files?.coverImage?.[0]?.path;

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

export { registerUser }