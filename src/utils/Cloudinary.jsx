// Direct upload function without the React wrapper
export const uploadToCloudinary = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Vite uses import.meta.env instead of process.env
  // Fallback to hardcoded values if environment variables are not set
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET 
    || import.meta.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    || 'ecoexpress_uploads'; // Fallback value
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME 
    || import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME
    || 'dnwqvjaru'; // Fallback value
  
  formData.append('upload_preset', uploadPreset);
  
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
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);
  });
};

// Generate optimized image URL (without cloudinary-core dependency)
export const getOptimizedImageUrl = (publicId, options = {}) => {
  // Vite uses import.meta.env instead of process.env
  // Fallback to hardcoded value if environment variables are not set
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME 
    || import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME
    || 'dnwqvjaru'; // Fallback value
  
  const {
    width = 800,
    height = 600,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;
  
  // Build Cloudinary URL manually
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  const transformationString = transformations.join(',');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
};