import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // verifying the token and store the user information from it
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // accessing the user info from the decodedToken
        // decodedTocken consists of id, username, email and fullName
        // here we are exlcuding the pwd and refreshToken
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;

        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

})