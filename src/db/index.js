import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

import { DB_NAME } from "../constants.js";

const connectDB = async () => {

    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log('MongoDB Connected !!');

    }catch(error){
        console.log('MongoDB Connection Failed', error);
    }
}
export default connectDB;