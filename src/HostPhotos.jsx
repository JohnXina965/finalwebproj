     import React, { useState, useRef, useEffect } from 'react';  // Add useEffect to imports
     import { Link, useNavigate } from 'react-router-dom';
     import { useHost } from './contexts/HostContext';
     const HostPhotos = () => {
       const { hostData, updateHostData } = useHost();
       const navigate = useNavigate();
       const fileInputRef = useRef(null);
       // Existing states...
       const [photos, setPhotos] = useState(hostData.photos || []);
       const [uploading, setUploading] = useState(false);
       const [dragActive, setDragActive] = useState(false);
       const [uploadProgress, setUploadProgress] = useState({});
       // Add this: State for mount animation
       const [mounted, setMounted] = useState(false);
       // Add this: Effect to set mounted to true after component mounts
       useEffect(() => {
         setMounted(true);
       }, []); 
       
  // Cloudinary upload function
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data;
  };

  // File validation
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only JPG, PNG, or WebP images');
      return false;
    }

    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size must be less than 10MB. Your file is ${fileSizeMB}MB.`);
      return false;
    }

    return true;
  };

  const handleFiles = async (files) => {
    console.log('=== STARTING FILE UPLOAD ===');

    const validFiles = Array.from(files).filter(validateFile);

    if (validFiles.length === 0) {
      console.log('❌ No valid files after validation');
      return;
    }

    // Test with just ONE file first
    const file = validFiles[0];
    console.log('📤 Processing file:', file.name);

    // Create temporary preview
    const tempId = Math.random().toString(36).substr(2, 9);
    const tempPhoto = {
      id: tempId,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      isPrimary: photos.length === 0,
      isUploading: true
    };

    setPhotos(prev => [...prev, tempPhoto]);

    try {
      console.log('🚀 Starting Cloudinary upload...');

      // Use hardcoded values for testing
      const CLOUD_NAME = 'dnwqvjaru';
      const UPLOAD_PRESET = 'ecoexpress_uploads';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('cloud_name', CLOUD_NAME);

      console.log('📤 Sending to Cloudinary...');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Cloudinary success!', data);

      // Update with Cloudinary data
      setPhotos(prev => prev.map(photo =>
        photo.id === tempId
          ? {
            id: data.public_id,
            url: data.secure_url,
            public_id: data.public_id,
            width: data.width,
            height: data.height,
            format: data.format,
            bytes: data.bytes,
            isPrimary: tempPhoto.isPrimary,
            isUploading: false
          }
          : photo
      ));

      URL.revokeObjectURL(tempPhoto.url);

    } catch (error) {
      console.error('❌ UPLOAD FAILED:', error);
      console.error('❌ Error details:', error.message);

      // Remove failed upload
      setPhotos(prev => prev.filter(photo => photo.id !== tempId));
      alert(`Failed to upload ${file.name}. Error: ${error.message}`);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(photo => photo.id !== id));
  };

  const setPrimaryPhoto = (id) => {
    setPhotos(prev => prev.map(photo => ({
      ...photo,
      isPrimary: photo.id === id
    })));
  };

  const movePhoto = (id, direction) => {
    setPhotos(prev => {
      const index = prev.findIndex(photo => photo.id === id);
      if ((direction === -1 && index === 0) || (direction === 1 && index === prev.length - 1)) {
        return prev; // Can't move further
      }

      const newPhotos = [...prev];
      const targetIndex = index + direction;
      [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
      return newPhotos;
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (photos.length === 0) {
    alert('Please upload at least one photo');
    return;
  }

  // Check if any photos are still uploading
  const stillUploading = photos.some(photo => photo.isUploading);
  if (stillUploading) {
    alert('Please wait for all photos to finish uploading');
    return;
  }

  if (!photos.some(photo => photo.isPrimary)) {
    alert('Please select a primary photo');
    return;
  }

  setUploading(true);

  try {
    console.log('Final photos to save:', photos);
    
    // Save to context with Cloudinary URLs
    updateHostData({
      photos: photos.map(photo => ({
        id: photo.id,
        url: photo.url,
        public_id: photo.public_id,
        isPrimary: photo.isPrimary,
        width: photo.width,
        height: photo.height
      })),
      currentStep: 7 // Updated to Step 7 (Policy & Compliance is next)
    });

    console.log('✅ All photos saved to context with Cloudinary URLs');
    
    // Navigate to Policy & Compliance instead of Publish Review
    navigate('/host/policy-compliance');
    
  } catch (error) {
    console.error('Save failed:', error);
    alert('Save failed. Please try again.');
  } finally {
    setUploading(false);
  }
};

  const getPropertyTypeLabel = () => {
    switch (hostData.propertyType) {
      case 'home': return 'property';
      case 'experience': return 'experience';
      case 'service': return 'service';
      default: return 'listing';
    }
  };

  return (
   <div className={`min-h-screen bg-gray-50 py-8 animate-multi-layer transition-all duration-1000 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar - UPDATED to 9 steps */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between mb-2 transition-all duration-500 delay-300">
            <span className="text-sm font-medium text-teal-600">Step 6 of 9</span>
            <span className="text-sm text-gray-500">Photos</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 transition-all duration-500 delay-400">
            <div className="bg-teal-600 h-2 rounded-full w-6/9 transition-all duration-700 delay-500"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-700 delay-400">
            Add photos of your {getPropertyTypeLabel()}
          </h1>
          <p className="text-gray-600 mb-6 transition-all duration-700 delay-500">
            Great photos help your listing stand out. Upload at least 5 photos to get started.
            {photos.length > 0 && ` (${photos.length}/20 uploaded)`}
          </p>


          {/* Upload Area */}
          {photos.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${dragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Drag your photos here</h3>
                <p className="text-gray-600 mb-4">
                  Upload at least 5 photos. You can upload up to 20 high-quality images.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Choose from computer
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  PNG, JPG, WEBP up to 10MB each
                </p>
              </div>
            </div>
          )}

          {/* Upload Button when photos exist */}
          {photos.length > 0 && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add more photos</span>
              </button>
              <p className="text-sm text-gray-500 mt-2">
                {20 - photos.length} photos remaining • PNG, JPG, WEBP up to 10MB each
              </p>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your photos ({photos.length}/20)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="relative group bg-gray-100 rounded-lg overflow-hidden">
                    {/* Image */}
                    <img
                      src={photo.url}
                      alt={`Preview ${index + 1}`}
                      className={`w-full h-48 object-cover ${photo.isUploading ? 'opacity-50' : ''}`}
                    />

                    {/* Uploading Indicator */}
                    {photo.isUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-sm">Uploading...</div>
                        </div>
                      </div>
                    )}

                    {/* Cloudinary Badge */}
                    {!photo.isUploading && photo.public_id && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ☁️ Cloud
                        </span>
                      </div>
                    )}

                    {/* Primary Badge */}
                    {photo.isPrimary && !photo.isUploading && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          ★ Primary
                        </span>
                      </div>
                    )}

                    {/* Action Overlay */}
                    {!photo.isUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setPrimaryPhoto(photo.id)}
                            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            title="Set as primary"
                          >
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>

                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => movePhoto(photo.id, -1)}
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                              title="Move left"
                            >
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          )}

                          {index < photos.length - 1 && (
                            <button
                              type="button"
                              onClick={() => movePhoto(photo.id, 1)}
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                              title="Move right"
                            >
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="p-2 bg-white rounded-full shadow-lg hover:bg-red-100 transition-colors"
                            title="Remove photo"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">📸 Photo Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use high-quality, well-lit photos</li>
              <li>• Show different angles and key features</li>
              <li>• Include both wide shots and close-ups</li>
              <li>• Choose your best photo as the primary image</li>
              {hostData.propertyType === 'experience' && <li>• Show guests participating in the experience</li>}
              {hostData.propertyType === 'service' && <li>• Show your work, tools, or before/after results</li>}
            </ul>
          </div>
 {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200 transition-all duration-500 delay-1400">
            <Link
              to="/host/pricing"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 delay-1500 hover:shadow-md hover:-translate-y-0.5"
            >
              Back
            </Link>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={uploading || photos.length === 0}
              className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-300 delay-1600 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Continue to Policies & Compliance</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPhotos;