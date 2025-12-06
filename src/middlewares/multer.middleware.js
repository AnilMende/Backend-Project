import multer from "multer";

// diskStorage : DiskStorage engine gives you full control on storing files to local system
const storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/temp')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname)
    }
})

// now this upload can be used as middleware
export const upload = multer({
    storage,
})
