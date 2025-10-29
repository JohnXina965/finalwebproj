import { Cloudinary } from 'cloudinary-core';

const cl = new Cloudinary({
  cloud_name: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
  secure: true
});

// Direct upload function without the React wrapper
export const uploadToCloudinary = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          id: response.public_id,
          url: response.secure_url,
          width: response.width,
          height: response.height,
          format: response.format,
          bytes: response.bytes
        });
      } else {
        reject(new Error('Upload failed'));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  });
};

// Generate optimized image URL
export const getOptimizedImageUrl = (publicId, options = {}) => {
  return cl.url(publicId, {
    width: 800,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
    ...options
  });
};