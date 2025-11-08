import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useHost } from '../../contexts/HostContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { uploadToCloudinary } from '../../utils/Cloudinary';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { doc, deleteDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../Firebase';
import { updateListing } from '../../services/ListingServices';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// CONSTANTS & OPTIONS
// ============================================================================

const amenitiesList = [
  'WiFi', 'Kitchen', 'Parking', 'Pool', 'Hot Tub', 
  'Air Conditioning', 'Heating', 'Washer', 'Dryer',
  'TV', 'Essentials', 'Pet Friendly', 'Gym'
];

const experienceTypes = [
  'Nature & Adventure',
  'Food & Drink',
  'Arts & Culture',
  'Wellness & Fitness',
  'History & Education',
  'Photography',
  'Music & Dance',
  'Craft & Workshop',
  'Water Sports',
  'Wildlife & Safari'
];

const includesOptions = [
  'Food & Drinks',
  'Equipment',
  'Transportation',
  'Professional Guide',
  'Souvenirs',
  'Photos',
  'Entrance Fees',
  'Certificates'
];

const fitnessLevels = [
  { value: 'easy', label: 'Easy (Suitable for everyone)' },
  { value: 'moderate', label: 'Moderate (Some physical activity)' },
  { value: 'active', label: 'Active (Good fitness level required)' },
  { value: 'challenging', label: 'Challenging (Experienced participants)' }
];

const serviceCategories = [
  'Home Repair & Maintenance',
  'Cleaning Services',
  'Gardening & Landscaping',
  'Personal Training',
  'Tutoring & Education',
  'Beauty & Wellness',
  'Pet Care',
  'Moving & Transportation',
  'Tech Support',
  'Consulting & Coaching',
  'Event Planning',
  'Photography & Videography',
  'Other'
];

const sustainablePracticesOptions = [
  'Uses eco-friendly products',
  'Zero-waste approach',
  'Energy efficient methods',
  'Water conservation',
  'Local materials sourcing',
  'Carbon neutral transportation',
  'Repair over replacement',
  'Upcycling & repurposing'
];

const currencies = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
];

// ============================================================================
// MAP COMPONENTS
// ============================================================================

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HostCreateListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { hostData, updateHostData, saveAsDraft, publishListing, clearHostData, loadDraft } = useHost();
  const { balance, deduct } = useWallet();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDraggable, setIsDraggable] = useState(false);
  const stepInitializedRef = useRef(false); // Track if step has been initialized (using ref to avoid re-renders)
  const draftLoadedRef = useRef(false); // Track if draft has been loaded to prevent multiple loads
  
  // Step 1: Property Type
  const [propertyType, setPropertyType] = useState(hostData.propertyType || null);
  
  // Step 2: Property Details (varies by type)
  const [homeDetails, setHomeDetails] = useState(hostData.homeDetails || {
    title: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 1,
    amenities: []
  });
  
  const [experienceDetails, setExperienceDetails] = useState(hostData.experienceDetails || {
    title: '',
    description: '',
    experienceType: '',
    duration: 2,
    groupSize: 1,
    includes: [],
    requirements: [],
    whatToBring: [],
    ageRequirement: 'all-ages',
    fitnessLevel: 'easy'
  });
  
  const [serviceDetails, setServiceDetails] = useState(hostData.serviceDetails || {
    title: '',
    description: '',
    serviceCategory: '',
    skills: [],
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    serviceRadius: 10,
    toolsProvided: [],
    certifications: [],
    experienceYears: 1,
    ecoFriendly: false,
    sustainablePractices: []
  });
  
  // Step 3: Location
  const [location, setLocation] = useState(hostData.location || {
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Philippines',
    coordinates: [14.5995, 120.9842]
  });
  const [markerPosition, setMarkerPosition] = useState(location.coordinates || [14.5995, 120.9842]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  // Step 4: Pricing
  const [pricing, setPricing] = useState(hostData.pricing || {
    basePrice: '',
    currency: 'PHP',
    cleaningFee: '',
    extraGuestFee: '',
    securityDeposit: '',
    discountWeekly: '',
    discountMonthly: '',
    pricingModel: 'per-night',
    minParticipants: 1,
    includesEquipment: false,
    ecoDiscount: false,
    sustainableChoice: false
  });
  
  // Step 5: Photos
  const [photos, setPhotos] = useState(hostData.photos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  
  // Step 6: Review & Publish
  const [publishing, setPublishing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  
  const totalSteps = 6;
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);
  
  // Load listing for editing or draft from URL on mount (only once)
  useEffect(() => {
    // Prevent multiple loads
    if (draftLoadedRef.current) {
      setLoading(false);
      return;
    }
    
    const editId = searchParams.get('edit');
    const draftId = searchParams.get('draft');
    
    if (editId && currentUser && !draftLoadedRef.current) {
      draftLoadedRef.current = true;
      setIsEditMode(true);
      setEditingListingId(editId);
      
      // Load existing listing data
      const loadListing = async () => {
        try {
          const listingDoc = await getDoc(doc(db, 'listings', editId));
          if (!listingDoc.exists()) {
            throw new Error('Listing not found');
          }
          
          const listingData = listingDoc.data();
          
          // Verify ownership
          if (listingData.hostId !== currentUser.uid) {
            throw new Error('You do not have permission to edit this listing');
          }
          
          // Populate form with existing data
          if (listingData.propertyType) setPropertyType(listingData.propertyType);
          if (listingData.homeDetails) setHomeDetails(listingData.homeDetails);
          if (listingData.experienceDetails) setExperienceDetails(listingData.experienceDetails);
          if (listingData.serviceDetails) setServiceDetails(listingData.serviceDetails);
          if (listingData.location) {
            setLocation(listingData.location);
            setMarkerPosition(listingData.location.coordinates || [14.5995, 120.9842]);
          }
          if (listingData.pricing) setPricing(listingData.pricing);
          if (listingData.photos) setPhotos(listingData.photos);
          
          // Update context
          updateHostData({
            propertyType: listingData.propertyType,
            homeDetails: listingData.homeDetails,
            experienceDetails: listingData.experienceDetails,
            serviceDetails: listingData.serviceDetails,
            location: listingData.location,
            pricing: listingData.pricing,
            photos: listingData.photos
          });
          
          // Determine step based on data completeness
          if (listingData.photos && listingData.photos.length > 0) {
            setCurrentStep(6);
          } else if (listingData.pricing) {
            setCurrentStep(5);
          } else if (listingData.location) {
            setCurrentStep(4);
          } else if (listingData.homeDetails || listingData.experienceDetails || listingData.serviceDetails) {
            setCurrentStep(3);
          } else {
            setCurrentStep(2);
          }
          
          toast.success('Listing loaded for editing!');
          setLoading(false);
        } catch (error) {
          console.error('Error loading listing:', error);
          toast.error(error.message || 'Failed to load listing');
          draftLoadedRef.current = false;
          setLoading(false);
          navigate('/host/dashboard');
        }
      };
      
      loadListing();
    } else if (draftId && currentUser && !draftLoadedRef.current) {
      draftLoadedRef.current = true;
      loadDraft(draftId).then(() => {
        toast.success('Draft loaded successfully!');
      }).catch((error) => {
        console.error('Error loading draft:', error);
        toast.error('Failed to load draft');
        draftLoadedRef.current = false;
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [searchParams, currentUser, navigate, updateHostData]);

  // Initialize step only once based on hostData (prevents auto-navigation on future updates)
  useEffect(() => {
    // Only initialize once, and only after loading is complete
    if (stepInitializedRef.current || loading) return;
    
    // Initialize step based on existing data (only runs once)
    if (hostData?.propertyType) {
      setPropertyType(hostData.propertyType);
      
      // Determine the correct step based on what data exists
      if (hostData.propertyType && (
        hostData.homeDetails || 
        hostData.experienceDetails || 
        hostData.serviceDetails
      )) {
        if (hostData.location) {
          if (hostData.pricing) {
            if (hostData.photos && hostData.photos.length > 0) {
              setCurrentStep(6); // Review step
            } else {
              setCurrentStep(5); // Photos step
            }
          } else {
            setCurrentStep(4); // Pricing step
          }
        } else {
          setCurrentStep(3); // Location step
        }
      } else if (hostData.propertyType) {
        setCurrentStep(2); // Details step
      }
      
      // Load form data
      if (hostData.homeDetails) setHomeDetails(hostData.homeDetails);
      if (hostData.experienceDetails) setExperienceDetails(hostData.experienceDetails);
      if (hostData.serviceDetails) setServiceDetails(hostData.serviceDetails);
      if (hostData.location) {
        setLocation(hostData.location);
        setMarkerPosition(hostData.location.coordinates || [14.5995, 120.9842]);
      }
      if (hostData.pricing) setPricing(hostData.pricing);
      if (hostData.photos) setPhotos(hostData.photos);
    }
    
    // Mark as initialized - this prevents this effect from running again
    // even when hostData changes due to auto-save
    stepInitializedRef.current = true;
    setLoading(false);
  }, [hostData, loading]); // Watch hostData and loading, but only run once due to ref check
  
  // Auto-save progress (debounced) - only saves form data, not step navigation
  useEffect(() => {
    if (loading || !stepInitializedRef.current) return; // Don't auto-save until step is initialized
    
    const saveProgress = async () => {
      try {
        // Build update object without undefined values
        // NOTE: We don't save currentStep here to prevent auto-navigation
        const updateData = {};
        
        if (propertyType) {
          updateData.propertyType = propertyType;
        }
        
        if (propertyType === 'home' && homeDetails) {
          updateData.homeDetails = homeDetails;
        } else if (propertyType === 'experience' && experienceDetails) {
          updateData.experienceDetails = experienceDetails;
        } else if (propertyType === 'service' && serviceDetails) {
          updateData.serviceDetails = serviceDetails;
        }
        
        if (location && location.address) {
          updateData.location = location;
        }
        
        if (pricing && pricing.basePrice) {
          updateData.pricing = pricing;
        }
        
        if (photos && photos.length > 0) {
          updateData.photos = photos;
        }
        
        // Only update if there's data to save
        if (Object.keys(updateData).length > 0) {
          updateHostData(updateData);
        }
      } catch (error) {
        console.error('Error auto-saving:', error);
      }
    };
    
    const timeoutId = setTimeout(saveProgress, 2000); // Increased debounce to 2 seconds
    return () => clearTimeout(timeoutId);
  }, [propertyType, homeDetails, experienceDetails, serviceDetails, location, pricing, photos, loading]);
  
  // Step 1: Property Type Selection
  const handlePropertyTypeSelect = (type) => {
    setPropertyType(type);
    updateHostData({ propertyType: type });
    setCurrentStep(2);
    toast.success(`Selected: ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  };
  
  // Step 2: Property Details
  const handleContinueFromDetails = () => {
    if (!propertyType) {
      toast.error('Please select a property type');
      return;
    }
    
    // Validate based on property type
    let isValid = true;
    const errors = {};
    
    if (propertyType === 'home') {
      if (!homeDetails.title.trim()) {
        errors.title = 'Title is required';
        isValid = false;
      }
      if (!homeDetails.description.trim()) {
        errors.description = 'Description is required';
        isValid = false;
      }
      if (homeDetails.maxGuests < 1) {
        errors.maxGuests = 'Max guests must be at least 1';
        isValid = false;
      }
    } else if (propertyType === 'experience') {
      if (!experienceDetails.title.trim()) {
        errors.title = 'Title is required';
        isValid = false;
      }
      if (!experienceDetails.description.trim()) {
        errors.description = 'Description is required';
        isValid = false;
      }
      if (!experienceDetails.experienceType) {
        errors.experienceType = 'Experience type is required';
        isValid = false;
      }
    } else if (propertyType === 'service') {
      if (!serviceDetails.title.trim()) {
        errors.title = 'Title is required';
        isValid = false;
      }
      if (!serviceDetails.description.trim()) {
        errors.description = 'Description is required';
        isValid = false;
      }
      if (!serviceDetails.serviceCategory) {
        errors.serviceCategory = 'Service category is required';
        isValid = false;
      }
    }
    
    if (!isValid) {
      setValidationErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }
    
    setValidationErrors({});
    setCurrentStep(3);
  };
  
  // Step 3: Location
  const handleContinueFromLocation = () => {
    if (!location.address.trim() || !location.city.trim() || !location.country.trim()) {
      toast.error('Please fill in all required location fields');
      return;
    }
    
    updateHostData({ location });
    setCurrentStep(4);
  };
  
  // Step 4: Pricing
  const handleContinueFromPricing = () => {
    if (!pricing.basePrice || parseFloat(pricing.basePrice) <= 0) {
      toast.error('Please set a valid base price');
      return;
    }
    
    updateHostData({ pricing });
    setCurrentStep(5);
  };
  
  // Step 5: Photos
  const handleContinueFromPhotos = () => {
    if (photos.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }
    
    updateHostData({ photos });
    setCurrentStep(6);
  };
  
  // Step 6: Publish
  const handlePublish = async () => {
    try {
      setPublishing(true);
      
      // Final validation with detailed messages
      const errors = [];
      
      if (!propertyType) {
        errors.push('Property type is required');
      }
      
      if (!location || !location.address || !location.city || !location.country) {
        errors.push('Complete location information is required');
      }
      
      if (!pricing || !pricing.basePrice || parseFloat(pricing.basePrice) <= 0) {
        errors.push('Valid pricing is required');
      }
      
      if (!photos || photos.length === 0) {
        errors.push('At least one photo is required');
      }
      
      // Validate property details based on type
      if (propertyType === 'home') {
        if (!homeDetails.title || !homeDetails.description) {
          errors.push('Home title and description are required');
        }
      } else if (propertyType === 'experience') {
        if (!experienceDetails.title || !experienceDetails.description || !experienceDetails.experienceType) {
          errors.push('Experience title, description, and type are required');
        }
      } else if (propertyType === 'service') {
        if (!serviceDetails.title || !serviceDetails.description || !serviceDetails.serviceCategory) {
          errors.push('Service title, description, and category are required');
        }
      }
      
      if (errors.length > 0) {
        toast.error(errors[0]);
        console.error('Validation errors:', errors);
        return;
      }
      
      // If editing, update existing listing
      if (isEditMode && editingListingId) {
        // Build update data
        const updateData = {
          propertyType,
          location,
          pricing,
          photos
        };
        
        if (propertyType === 'home' && homeDetails) {
          updateData.homeDetails = homeDetails;
        } else if (propertyType === 'experience' && experienceDetails) {
          updateData.experienceDetails = experienceDetails;
        } else if (propertyType === 'service' && serviceDetails) {
          updateData.serviceDetails = serviceDetails;
        }
        
        // Update listing
        await updateListing(editingListingId, updateData);
        setPublishedListingId(editingListingId);
        toast.success('Listing updated successfully!');
        setShowSuccessModal(true);
        return;
      }
      
      // Check listing limits before publishing (only for new listings)
      try {
        // Get current subscription plan
        const hostDocRef = doc(db, 'hosts', currentUser.uid);
        const hostDoc = await getDoc(hostDocRef);
        let subscriptionPlan = null;
        
        if (hostDoc.exists()) {
          const hostData = hostDoc.data();
          subscriptionPlan = hostData.subscriptionPlan?.id || hostData.subscriptionPlan;
        }
        
        // Get current listing count
        const listingsQuery = query(
          collection(db, 'listings'),
          where('hostId', '==', currentUser.uid),
          where('status', '==', 'published')
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const currentListingsCount = listingsSnapshot.size;
        
        // Define listing limits by plan
        const listingLimits = {
          basic: 1,
          professional: 5,
          enterprise: -1, // unlimited
        };
        
        const maxListings = subscriptionPlan ? (listingLimits[subscriptionPlan] || 0) : 0;
        
        // Check if limit reached (skip if unlimited or no plan)
        if (maxListings !== -1 && maxListings > 0 && currentListingsCount >= maxListings) {
          toast.error(
            `You've reached your listing limit (${maxListings} listing${maxListings > 1 ? 's' : ''}). ` +
            `Please upgrade your subscription plan to create more listings.`,
            { duration: 5000 }
          );
          // Show upgrade modal or redirect
          const upgrade = window.confirm(
            `You've reached your listing limit.\n\n` +
            `Current plan: ${subscriptionPlan || 'None'}\n` +
            `Current listings: ${currentListingsCount} / ${maxListings}\n\n` +
            `Would you like to upgrade your subscription plan?`
          );
          if (upgrade) {
            navigate('/host/subscription');
          }
          return;
        }
      } catch (limitError) {
        console.error('Error checking listing limits:', limitError);
        // Continue with publishing if check fails (don't block user)
      }
      
      // Save final data to context before publishing (only defined values)
      const finalData = {
        propertyType,
        location,
        pricing,
        photos
      };
      
      if (propertyType === 'home' && homeDetails) {
        finalData.homeDetails = homeDetails;
      } else if (propertyType === 'experience' && experienceDetails) {
        finalData.experienceDetails = experienceDetails;
      } else if (propertyType === 'service' && serviceDetails) {
        finalData.serviceDetails = serviceDetails;
      }
      
      updateHostData(finalData);
      
      // Small delay to ensure context is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const listingId = await publishListing();
      setPublishedListingId(listingId);
      
      // Delete draft if this listing was created from a draft
      // Check URL parameter first (when Continue is clicked on a draft)
      let draftIdToDelete = searchParams.get('draft');
      
      // Also check if there's a draftId stored in hostData (from saveAsDraft)
      if (!draftIdToDelete && hostData.draftId) {
        draftIdToDelete = hostData.draftId;
      }
      
      if (draftIdToDelete) {
        try {
          await deleteDoc(doc(db, 'drafts', draftIdToDelete));
          console.log('✅ Draft deleted after publishing');
        } catch (error) {
          console.error('❌ Error deleting draft:', error);
          // Don't show error to user - listing was published successfully
          // The draft will remain but that's okay
        }
      }
      
      setShowSuccessModal(true);
      toast.success('Listing published successfully!');
    } catch (error) {
      console.error('Error publishing listing:', error);
      const errorMessage = error.message || 'Failed to publish listing. Please try again.';
      toast.error(errorMessage);
    } finally {
      setPublishing(false);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Helper function to save draft and exit to dashboard
  const handleSaveAndExit = async () => {
    try {
      const updateData = {
        propertyType,
        currentStep
      };
      
      if (propertyType === 'home' && homeDetails) {
        updateData.homeDetails = homeDetails;
      } else if (propertyType === 'experience' && experienceDetails) {
        updateData.experienceDetails = experienceDetails;
      } else if (propertyType === 'service' && serviceDetails) {
        updateData.serviceDetails = serviceDetails;
      }
      
      if (location && location.address) {
        updateData.location = location;
      }
      
      if (pricing && pricing.basePrice) {
        updateData.pricing = pricing;
      }
      
      if (photos && photos.length > 0) {
        updateData.photos = photos;
      }
      
      updateHostData(updateData);
      await new Promise(resolve => setTimeout(resolve, 200));
      await saveAsDraft();
      toast.success('Progress saved!');
      navigate('/host/dashboard');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save progress');
    }
  };
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  // Location helpers
  const geocodeAddress = async (country, city) => {
    if (!country || !city) return;
    try {
      const query = `${city}, ${country}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'EcoExpress Location Finder'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = [parseFloat(lat), parseFloat(lon)];
        setMarkerPosition(newCoords);
        setLocation(prev => ({
          ...prev,
          coordinates: newCoords
        }));
        setIsDraggable(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };
  
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition([lat, lng]);
    setLocation(prev => ({
      ...prev,
      coordinates: [lat, lng]
    }));
  };
  
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const position = marker.getLatLng();
    setMarkerPosition([position.lat, position.lng]);
    setLocation(prev => ({
      ...prev,
      coordinates: [position.lat, position.lng]
    }));
  };
  
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(prev => ({
            ...prev,
            coordinates: [latitude, longitude]
          }));
          setMarkerPosition([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your current location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };
  
  // Photo helpers
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only JPG, PNG, or WebP images');
      return false;
    }
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File size must be less than 10MB. Your file is ${fileSizeMB}MB.`);
      return false;
    }
    return true;
  };
  
  const handlePhotoUpload = async (file) => {
    if (!validateFile(file)) return;
    
    const tempId = Math.random().toString(36).substr(2, 9);
    const tempPhoto = {
      id: tempId,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      isPrimary: photos.length === 0,
      isUploading: true
    };
    
    setPhotos(prev => [...prev, tempPhoto]);
    setUploadingPhoto(true);
    
    try {
      const CLOUD_NAME = 'dnwqvjaru';
      const UPLOAD_PRESET = 'ecoexpress_uploads';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setPhotos(prev => prev.map(photo =>
        photo.id === tempId
          ? {
              id: data.public_id,
              url: data.secure_url,
              public_id: data.public_id,
              isPrimary: tempPhoto.isPrimary,
              isUploading: false
            }
          : photo
      ));
      URL.revokeObjectURL(tempPhoto.url);
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setPhotos(prev => prev.filter(photo => photo.id !== tempId));
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
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
  
  // Pricing helpers
  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === pricing.currency);
    return currency ? currency.symbol : '₱';
  };
  
  // Property type helpers
  const isHome = propertyType === 'home';
  const isExperience = propertyType === 'experience';
  const isService = propertyType === 'service';
  
  // Home details helpers
  const handleAmenityToggle = (amenity) => {
    setHomeDetails(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };
  
  // Experience details helpers
  const handleArrayToggle = (field, item) => {
    setExperienceDetails(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };
  
  const handleWhatToBringAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newItem = e.target.value.trim();
      setExperienceDetails(prev => ({
        ...prev,
        whatToBring: [...prev.whatToBring, newItem]
      }));
      e.target.value = '';
    }
  };
  
  const handleRequirementAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newItem = e.target.value.trim();
      setExperienceDetails(prev => ({
        ...prev,
        requirements: [...prev.requirements, newItem]
      }));
      e.target.value = '';
    }
  };
  
  // Service details helpers
  const handleSkillsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newSkill = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill]
      }));
      e.target.value = '';
    }
  };
  
  const handleToolsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTool = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        toolsProvided: [...prev.toolsProvided, newTool]
      }));
      e.target.value = '';
    }
  };
  
  const handleCertificationsAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newCert = e.target.value.trim();
      setServiceDetails(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCert]
      }));
      e.target.value = '';
    }
  };
  
  // Initialize map on step 3
  useEffect(() => {
    if (currentStep === 3) {
      setIsMapLoaded(true);
    }
  }, [currentStep]);
  
  // Set default pricing model based on property type
  useEffect(() => {
    if (currentStep === 4 && !pricing.pricingModel) {
      if (isHome) {
        setPricing(prev => ({ ...prev, pricingModel: 'per-night' }));
      } else if (isExperience) {
        setPricing(prev => ({ ...prev, pricingModel: 'per-person' }));
      } else if (isService) {
        setPricing(prev => ({ ...prev, pricingModel: 'flat-rate' }));
      }
    }
  }, [currentStep, propertyType, pricing.pricingModel, isHome, isExperience, isService]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Progress Bar */}
      <div className="container mx-auto px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-semibold text-green-600">
              {progressPercentage}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isEditMode ? '✅ Listing Updated!' : '🎉 Listing Published!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isEditMode 
                ? 'Your listing has been updated successfully! Changes are now live.'
                : 'Your listing has been published successfully! It\'s now live and visible to guests.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/host/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  clearHostData();
                  setCurrentStep(1);
                  setShowSuccessModal(false);
                }}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render Step 1: Property Type
  function renderStep1() {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">What are you offering?</h2>
          <p className="text-gray-600">Choose the category that best fits your listing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handlePropertyTypeSelect('home')}
            className={`p-6 rounded-xl border-2 transition-all ${
              propertyType === 'home'
                ? 'border-orange-500 bg-orange-50 scale-105'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              propertyType === 'home' ? 'bg-orange-200' : 'bg-orange-100'
            }`}>
              <span className="text-2xl">🏠</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Home</h3>
            <p className="text-gray-600 text-sm">
              Rent out your property, apartment, or vacation home
            </p>
          </button>

          <button
            onClick={() => handlePropertyTypeSelect('experience')}
            className={`p-6 rounded-xl border-2 transition-all ${
              propertyType === 'experience'
                ? 'border-orange-500 bg-orange-50 scale-105'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              propertyType === 'experience' ? 'bg-orange-200' : 'bg-orange-100'
            }`}>
              <span className="text-2xl">🎭</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Experience</h3>
            <p className="text-gray-600 text-sm">
              Host tours, activities, workshops, or events
            </p>
          </button>

          <button
            onClick={() => handlePropertyTypeSelect('service')}
            className={`p-6 rounded-xl border-2 transition-all ${
              propertyType === 'service'
                ? 'border-orange-500 bg-orange-50 scale-105'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              propertyType === 'service' ? 'bg-orange-200' : 'bg-orange-100'
            }`}>
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Service</h3>
            <p className="text-gray-600 text-sm">
              Offer your skills, repairs, consultations, or professional services
            </p>
          </button>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate('/host/dashboard')}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER STEP 2: PROPERTY DETAILS (Home/Experience/Service)
  // ============================================================================
  
  function renderStep2() {
    if (!propertyType) {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Please select a property type first</p>
          <button
            onClick={() => setCurrentStep(1)}
            className="mt-4 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Go Back to Select Type
          </button>
        </div>
      );
    }
    
    // Render Home Details
    if (propertyType === 'home') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your place</h2>
            <p className="text-gray-600">Share some basic info about your property</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Title *
              </label>
              <input
                type="text"
                value={homeDetails.title}
                onChange={(e) => {
                  setHomeDetails(prev => ({ ...prev, title: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, title: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Cozy apartment with city view"
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={homeDetails.description}
                onChange={(e) => {
                  setHomeDetails(prev => ({ ...prev, description: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, description: null }));
                }}
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your space, amenities, and what makes it special..."
              />
              {validationErrors.description && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms *
                </label>
                <select
                  value={homeDetails.bedrooms}
                  onChange={(e) => setHomeDetails(prev => ({ ...prev, bedrooms: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'bedroom' : 'bedrooms'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bathrooms *
                </label>
                <select
                  value={homeDetails.bathrooms}
                  onChange={(e) => setHomeDetails(prev => ({ ...prev, bathrooms: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {[1,1.5,2,2.5,3,3.5,4,4.5,5].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'bathroom' : 'bathrooms'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Guests *
                </label>
                <select
                  value={homeDetails.maxGuests}
                  onChange={(e) => {
                    setHomeDetails(prev => ({ ...prev, maxGuests: parseInt(e.target.value) }));
                    setValidationErrors(prev => ({ ...prev, maxGuests: null }));
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                    validationErrors.maxGuests ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                What amenities do you offer? *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homeDetails.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSaveAndExit}
              className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save & Exit
            </button>
            <button
              onClick={handleContinueFromDetails}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Continue to Location
            </button>
          </div>
        </div>
      );
    }
    
    // Render Experience Details
    if (propertyType === 'experience') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your experience</h2>
            <p className="text-gray-600">Share details about what guests will experience</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Experience Title *
              </label>
              <input
                type="text"
                value={experienceDetails.title}
                onChange={(e) => {
                  setExperienceDetails(prev => ({ ...prev, title: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, title: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Amazing sunset tour"
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={experienceDetails.description}
                onChange={(e) => {
                  setExperienceDetails(prev => ({ ...prev, description: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, description: null }));
                }}
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the experience, what guests will do, and what makes it special..."
              />
              {validationErrors.description && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Experience Type *
              </label>
              <select
                value={experienceDetails.experienceType}
                onChange={(e) => {
                  setExperienceDetails(prev => ({ ...prev, experienceType: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, experienceType: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.experienceType ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select experience type</option>
                {experienceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {validationErrors.experienceType && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.experienceType}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={experienceDetails.duration}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, duration: parseInt(e.target.value) || 2 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Group Size
                </label>
                <input
                  type="number"
                  min="1"
                  value={experienceDetails.groupSize}
                  onChange={(e) => setExperienceDetails(prev => ({ ...prev, groupSize: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                What's included?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {includesOptions.map((item) => (
                  <label key={item} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={experienceDetails.includes.includes(item)}
                      onChange={() => handleArrayToggle('includes', item)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fitness Level
              </label>
              <select
                value={experienceDetails.fitnessLevel}
                onChange={(e) => setExperienceDetails(prev => ({ ...prev, fitnessLevel: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {fitnessLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSaveAndExit}
              className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save & Exit
            </button>
            <button
              onClick={handleContinueFromDetails}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Continue to Location
            </button>
          </div>
        </div>
      );
    }
    
    // Render Service Details
    if (propertyType === 'service') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your service</h2>
            <p className="text-gray-600">Share details about what you offer</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Title *
              </label>
              <input
                type="text"
                value={serviceDetails.title}
                onChange={(e) => {
                  setServiceDetails(prev => ({ ...prev, title: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, title: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Professional cleaning service"
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={serviceDetails.description}
                onChange={(e) => {
                  setServiceDetails(prev => ({ ...prev, description: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, description: null }));
                }}
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your service, skills, and what clients can expect..."
              />
              {validationErrors.description && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Category *
              </label>
              <select
                value={serviceDetails.serviceCategory}
                onChange={(e) => {
                  setServiceDetails(prev => ({ ...prev, serviceCategory: e.target.value }));
                  setValidationErrors(prev => ({ ...prev, serviceCategory: null }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  validationErrors.serviceCategory ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select service category</option>
                {serviceCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {validationErrors.serviceCategory && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.serviceCategory}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Skills (Press Enter to add)
              </label>
              <input
                type="text"
                onKeyDown={handleSkillsAdd}
                placeholder="Type a skill and press Enter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceDetails.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    {skill}
                    <button
                      onClick={() => setServiceDetails(prev => ({
                        ...prev,
                        skills: prev.skills.filter((_, i) => i !== index)
                      }))}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Availability
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const dayKey = day.toLowerCase();
                  return (
                    <label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serviceDetails.availability[dayKey]}
                        onChange={(e) => setServiceDetails(prev => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            [dayKey]: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSaveAndExit}
              className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save & Exit
            </button>
            <button
              onClick={handleContinueFromDetails}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Continue to Location
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  }
  
  // ============================================================================
  // RENDER STEP 3: LOCATION
  // ============================================================================
  
  function renderStep3() {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Where's your place located?</h2>
          <p className="text-gray-600">Guests will only get your exact address once they book</p>
        </div>

        <div className="space-y-6">
          {/* Map Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Pin your location on the map *
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Use My Current Location
              </button>
            </div>
            
            <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
              {isMapLoaded && (
                <MapContainer
                  center={markerPosition}
                  zoom={isDraggable ? 15 : 13}
                  style={{ height: '100%', width: '100%' }}
                  key={`${markerPosition[0]}-${markerPosition[1]}`}
                >
                  <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker 
                    position={markerPosition}
                    draggable={isDraggable}
                    eventHandlers={{
                      dragend: handleMarkerDragEnd
                    }}
                  >
                    <Popup>
                      Your property location<br />
                      Lat: {markerPosition[0].toFixed(6)}<br />
                      Lng: {markerPosition[1].toFixed(6)}
                    </Popup>
                  </Marker>
                  <MapClickHandler onMapClick={handleMapClick} />
                  <MapUpdater center={markerPosition} />
                </MapContainer>
              )}
            </div>
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={location.address}
                onChange={(e) => {
                  setLocation(prev => ({ ...prev, address: e.target.value }));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={location.city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  setLocation(prev => ({ ...prev, city: newCity }));
                  if (newCity && location.country) {
                    setTimeout(() => geocodeAddress(location.country, newCity), 500);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                name="state"
                value={location.state}
                onChange={(e) => setLocation(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="State or province"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                name="zipCode"
                value={location.zipCode}
                onChange={(e) => setLocation(prev => ({ ...prev, zipCode: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="ZIP or postal code"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={location.country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  setLocation(prev => ({ ...prev, country: newCountry }));
                  if (newCountry && location.city) {
                    setTimeout(() => geocodeAddress(newCountry, location.city), 500);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSaveAndExit}
            className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save & Exit
          </button>
          <button
            onClick={handleContinueFromLocation}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Continue to Pricing
          </button>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER STEP 4: PRICING
  // ============================================================================
  
  function renderStep4() {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Set your pricing</h2>
          <p className="text-gray-600">Choose how you want to price your {propertyType}</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Currency *
            </label>
            <select
              value={pricing.currency}
              onChange={(e) => setPricing(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isHome && 'Price per night'}
              {isExperience && 'Price per person'}
              {isService && 'Base service price'}
              *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">{getCurrencySymbol()}</span>
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                value={pricing.basePrice}
                onChange={(e) => setPricing(prev => ({ ...prev, basePrice: e.target.value }))}
                className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Home-specific pricing */}
          {isHome && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cleaning fee (optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">{getCurrencySymbol()}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricing.cleaningFee}
                    onChange={(e) => setPricing(prev => ({ ...prev, cleaningFee: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Extra guest fee (optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">{getCurrencySymbol()}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricing.extraGuestFee}
                    onChange={(e) => setPricing(prev => ({ ...prev, extraGuestFee: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">per extra guest</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Experience/Service pricing model */}
          {(isExperience || isService) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pricing Model *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                  pricing.pricingModel === 'per-person' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="pricingModel"
                    value="per-person"
                    checked={pricing.pricingModel === 'per-person'}
                    onChange={(e) => setPricing(prev => ({ ...prev, pricingModel: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Per Person</div>
                    <div className="text-gray-500">Charged per participant</div>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                  pricing.pricingModel === 'flat-rate' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="pricingModel"
                    value="flat-rate"
                    checked={pricing.pricingModel === 'flat-rate'}
                    onChange={(e) => setPricing(prev => ({ ...prev, pricingModel: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Flat Rate</div>
                    <div className="text-gray-500">Fixed price for group</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSaveAndExit}
            className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save & Exit
          </button>
          <button
            onClick={handleContinueFromPricing}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Continue to Photos
          </button>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER STEP 5: PHOTOS
  // ============================================================================
  
  function renderStep5() {
    
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
        Array.from(e.dataTransfer.files).forEach(file => handlePhotoUpload(file));
      }
    };
    
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Add photos</h2>
          <p className="text-gray-600">Upload at least one photo to showcase your {propertyType}</p>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'
          }`}
        >
          {photos.length === 0 ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600">Drag and drop photos here, or click to browse</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Choose Photos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">Drag and drop more photos, or click to browse</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                Add More Photos
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(file => handlePhotoUpload(file));
              }
            }}
            className="hidden"
          />
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Photos ({photos.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 relative">
                    {photo.isUploading ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                      </div>
                    ) : (
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {photo.isPrimary && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPrimaryPhoto(photo.id)}
                      disabled={photo.isPrimary || photo.isUploading}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white text-gray-700 rounded text-sm font-semibold hover:bg-gray-100 transition-opacity disabled:opacity-50"
                    >
                      {photo.isPrimary ? 'Primary' : 'Set Primary'}
                    </button>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      disabled={photo.isUploading}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-500 text-white rounded text-sm font-semibold hover:bg-red-600 transition-opacity disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadingPhoto && (
          <div className="text-center mt-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-2">Uploading...</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSaveAndExit}
            className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save & Exit
          </button>
          <button
            onClick={handleContinueFromPhotos}
            disabled={photos.length === 0 || uploadingPhoto}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Review
          </button>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER STEP 6: REVIEW & PUBLISH
  // ============================================================================
  
  function renderStep6() {
    const getPropertyDetails = () => {
      switch(propertyType) {
        case 'home': return homeDetails;
        case 'experience': return experienceDetails;
        case 'service': return serviceDetails;
        default: return null;
      }
    };
    
    const getPropertyTypeLabel = () => {
      switch(propertyType) {
        case 'home': return 'Property';
        case 'experience': return 'Experience';
        case 'service': return 'Service';
        default: return 'Listing';
      }
    };
    
    const propertyDetails = getPropertyDetails();
    
    if (!propertyDetails) {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-center">
          <p className="text-gray-600 mb-4">Listing data is incomplete</p>
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Start Over
          </button>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Review Your Changes' : 'Review Your Listing'}
          </h2>
          <p className="text-gray-600">
            {isEditMode 
              ? 'Review your changes and update your listing' 
              : 'Almost there! Review your information and publish'}
          </p>
        </div>

        {/* Listing Summary */}
        <div className="space-y-6 mb-8">
          {/* Title & Description */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Title & Description</h3>
            <p className="text-xl font-bold text-gray-900">{propertyDetails.title}</p>
            <p className="text-gray-600 mt-2">{propertyDetails.description}</p>
          </div>

          {/* Location */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
            <p className="text-gray-600">
              {location.address}, {location.city}, {location.state} {location.zipCode}, {location.country}
            </p>
          </div>

          {/* Pricing */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h3>
            <p className="text-2xl font-bold text-gray-900">
              {getCurrencySymbol()}{parseFloat(pricing.basePrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              {isHome && ' per night'}
              {isExperience && ' per person'}
              {isService && ' base price'}
            </p>
          </div>

          {/* Photos */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos ({photos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                  <img src={photo.url} alt="Listing" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={async () => {
              try {
                const updateData = {
                  propertyType,
                  location,
                  pricing,
                  photos,
                  currentStep
                };
                
                if (propertyType === 'home' && homeDetails) {
                  updateData.homeDetails = homeDetails;
                } else if (propertyType === 'experience' && experienceDetails) {
                  updateData.experienceDetails = experienceDetails;
                } else if (propertyType === 'service' && serviceDetails) {
                  updateData.serviceDetails = serviceDetails;
                }
                
                updateHostData(updateData);
                await new Promise(resolve => setTimeout(resolve, 300));
                await saveAsDraft();
                toast.success('Progress saved!');
                navigate('/host/dashboard');
              } catch (error) {
                console.error('Error saving draft:', error);
                toast.error('Failed to save progress');
              }
            }}
            className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save & Exit
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing 
              ? (isEditMode ? 'Updating...' : 'Publishing...') 
              : (isEditMode ? 'Update Listing' : 'Publish Listing')}
          </button>
        </div>
      </div>
    );
  }
};

export default HostCreateListing;

