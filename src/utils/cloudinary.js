import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {

    try {
        // no file
        if (!localFilePath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        // file has been uploaded successflly
        // console.log('File Has Been Uploaded Successfully', response.url);

        // Delete file only after the file got uploaded in cloudinary
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;

    } catch (error) {
        // removing the locally saved temporary file, as the upload operation gets failed
        fs.unlinkSync(localFilePath);
        // console.log("Cloudinary Upload Error", error);
        return null
    }
}

export { uploadOnCloudinary }