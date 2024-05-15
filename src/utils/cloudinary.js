import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary =async (localfilepath) =>{
    try {
        if(!localfilepath) return null
        // upload the file from our local server to cloudinary
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
        })
        // file upload has been successfull
        console.log(`The file has been uploaded successfully: ${response.url}`)
        return response;

    } catch{
        fs.unlink(localfilepath) // remove locally saved temp file from server as upload has been failed
    
    }

}

export {uploadOnCloudinary}

// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });