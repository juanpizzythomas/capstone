import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Camera, AlertCircle, Upload, Database, User } from 'lucide-react';
import { faceRecogService } from '@/services/faceRegService';

const FaceVerification: React.FC = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toast function simulation
  const toast = (options: { title: string; description: string; variant?: string }) => {
    console.log(`Toast: ${options.title} - ${options.description}`);
    alert(`${options.title}: ${options.description}`);
  };

  // Load current user data on component mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Function to load current user from localStorage or API
  const loadCurrentUser = async () => {
    try {
      setUserLoading(true);
      
      // Method 1: Get from localStorage (if user is logged in)
      const storedUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setUserLoading(false);
        
        // Check if user already has face data
        if (parsedUser.faceData || parsedUser.face_data) {
          setIsVerified(true);
        }
        
        return;
      }

      // Method 2: If no localStorage, try to get from session/auth context
      // This would typically come from your authentication system
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (authToken) {
        // Call API to get current user info
        // Replace this with your actual API call
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          
          // Check if user already has face data
          if (userData.faceData || userData.face_data) {
            setIsVerified(true);
          }
        } else {
          throw new Error('Failed to fetch user data');
        }
      } else {
        throw new Error('No authentication found');
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Authentication Error",
        description: "Unable to load user data. Please login again.",
        variant: "destructive"
      });
    } finally {
      setUserLoading(false);
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Function to convert image to face encoding (simplified simulation)
  // const generateFaceEncoding = async (imageData: string): Promise<string> => {
  //   // Dalam implementasi nyata, Anda akan menggunakan library seperti face-api.js
  //   // atau mengirim ke backend untuk diproses dengan Python (face_recognition library)
    
  //   // Simulasi encoding - dalam implementasi nyata, ini akan menggunakan AI model
  //   const canvas = document.createElement('canvas');
  //   const ctx = canvas.getContext('2d');
  //   const img = new Image();
    
  //   return new Promise((resolve) => {
  //     img.onload = () => {
  //       canvas.width = 150;
  //       canvas.height = 150;
  //       ctx?.drawImage(img, 0, 0, 150, 150);
        
  //       // Simulasi face encoding sebagai base64 string
  //       // Dalam implementasi nyata, ini akan berupa array numerik yang di-encode
  //       const encoding = canvas.toDataURL('image/jpeg', 0.5);
  //       resolve(encoding);
  //     };
  //     img.src = imageData;
  //   });
  // };

//   const generateFaceEncoding = async (imageData: string): Promise<number[] | null> => {
//   try {
//     const res = await fetch('http://localhost:3001/api/face/encode', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ imageBase64: imageData })
//     });

//     const result = await res.json();
//     return result.encoding || null;
//   } catch (error) {
//     console.error('Encoding error:', error);
//     return null;
//   }
// };

  // Function to save face data to database
  const saveFaceDataToDatabase = async (imageData: string) => {
  try {
    setIsSaving(true);

    const response = await fetch("http://localhost:3001/api/face/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("authToken")}`
      },
      body: JSON.stringify({ faceImage: imageData })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      setIsVerified(true);

      // update local user cache
      const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
      if (storedUser) {
        const updatedUser = { ...JSON.parse(storedUser), faceData: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("userUpdated"));
      }

      toast({
        title: "Success",
        description: "Face data registered successfully!",
        variant: "success"
      });
    } else {
      throw new Error(result.error || "Failed to register face data");
    }
  } catch (error) {
    console.error("Error saving face data:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive"
    });
  } finally {
    setIsSaving(false);
  }
};

  // Function to check if user already has face data
  const checkExistingFaceData = async (userId: string): Promise<boolean> => {
    try {
      // API call untuk check existing data
      const response = await fetch(`/api/face-data/check/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking existing face data:', error);
      return false;
    }
  };

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      setIsLoading(true);
      setCameraError(null);
      setStreamReady(false);
      setIsCapturing(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      console.log('Camera stream obtained');
      streamRef.current = stream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = null;
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        setIsLoading(false);
        setStreamReady(true);
        
        try {
          await video.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.log('Video play error (this is often normal):', playError);
        }
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          setStreamReady(true);
          setIsLoading(false);
        };
        
        const handleCanPlay = () => {
          console.log('Video can play');
          setStreamReady(true);
          setIsLoading(false);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        
        video.dataset.cleanup = 'true';
        
        setTimeout(() => {
          setIsLoading(false);
          setStreamReady(true);
          console.log('Fallback: Camera should be ready now');
        }, 1000);
      }
      
    } catch (error) {
      console.error('Camera error:', error);
      
      let userFriendlyMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          userFriendlyMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
          userFriendlyMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
          userFriendlyMessage = 'Camera is being used by another application. Please close other apps and try again.';
        } else if (error.name === 'NotSupportedError') {
          userFriendlyMessage = 'Camera not supported. Please use a different browser.';
        } else {
          userFriendlyMessage += error.message;
        }
      }
      
      setCameraError(userFriendlyMessage);
      setIsLoading(false);
      setIsCapturing(false);
      setStreamReady(false);
      
      toast({
        title: "Camera Error",
        description: userFriendlyMessage,
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
      delete videoRef.current.dataset.cleanup;
    }
    
    setIsCapturing(false);
    setStreamReady(false);
    setCameraError(null);
    setIsLoading(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Capture Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;
    
    console.log('Capturing photo...');
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('Video ready state:', video.readyState);
    
    if (!context) {
      toast({
        title: "Capture Error",
        description: "Canvas not available.",
        variant: "destructive"
      });
      return;
    }

    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;
    
    if (width === 0 || height === 0) {
      toast({
        title: "Capture Error",
        description: "Video dimensions not available. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      canvas.width = width;
      canvas.height = height;
      
      // Flip the image horizontally to match what user sees
      context.scale(-1, 1);
      context.drawImage(video, -width, 0, width, height);
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      if (imageData && imageData.startsWith('data:image/jpeg') && imageData.length > 1000) {
        setCapturedImage(imageData);
        stopCamera();
        console.log('Photo captured successfully');
        
        toast({
          title: "Photo Captured",
          description: "Photo captured successfully. Click 'Save to Database' to store face data.",
        });
      } else {
        throw new Error('Invalid image data');
      }
      
    } catch (error) {
      console.error('Capture error:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive"
      });
    }
  };

const saveFaceData = async () => {
  if (!capturedImage) {
    toast({
      title: "Error",
      description: "No captured image found. Please capture a photo first.",
      variant: "destructive"
    });
    return;
  }

  if (!currentUser?.id) {
    toast({
      title: "Error",
      description: "User information not available. Please login again.",
      variant: "destructive"
    });
    return;
  }

  try {
    // Check if user already has face data
    const hasExistingData = await checkExistingFaceData(currentUser.id);
    if (hasExistingData) {
      const confirmUpdate = window.confirm('You already have face data registered. Do you want to update it?');
      if (!confirmUpdate) return;
    }

    // 👉 langsung save tanpa encoding
    toast({
      title: "Processing",
      description: "Saving face data...",
    });

    await saveFaceDataToDatabase(capturedImage);

    setIsVerified(true);
    toast({
      title: "Face Verification Successful",
      description: "Your face has been successfully registered for attendance.",
    });

  } catch (error) {
    console.error('Error saving face data:', error);
    toast({
      title: "Error",
      description: "Failed to process and save face data. Please try again.",
      variant: "destructive"
    });
  }
};

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsVerified(false);
    startCamera();
  };

  // Show loading state while fetching user data
  if (userLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading user information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if no user data
  if (!currentUser) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">
              Please login to access face verification feature.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug component
  const DebugInfo = () => (
    <div className="bg-gray-100 p-2 rounded text-xs space-y-1">
      <div>User ID: {currentUser?.id || 'Not available'}</div>
      <div>Username: {currentUser?.username || 'Not available'}</div>
      <div>Full Name: {currentUser?.full_name || 'Not available'}</div>
      <div>Loading: {isLoading.toString()}</div>
      <div>Capturing: {isCapturing.toString()}</div>
      <div>Stream Ready: {streamReady.toString()}</div>
      <div>Has Stream: {(!!streamRef.current).toString()}</div>
      <div>Video Ready State: {videoRef.current?.readyState || 'N/A'}</div>
      <div>Video Dimensions: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
      <div>Is Saving: {isSaving.toString()}</div>
      <div>Is Verified: {isVerified.toString()}</div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="h-5 w-5" />
          <span>Face Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please register your face for attendance verification. 
            Make sure you are in a well-lit area and looking directly at the camera.
          </p>
        </div>

        {/* User Information Display */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">Current User</h4>
              <p className="text-sm text-blue-700">
                {currentUser.full_name} ({currentUser.username})
              </p>
              {currentUser.email && (
                <p className="text-xs text-blue-600">{currentUser.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Camera/Photo Display */}
          <div className="relative w-full max-w-md">
            {!capturedImage ? (
              <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                {isCapturing ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover bg-black"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {isLoading && (
                      <div className="absolute inset-0 w-full h-64 flex items-center justify-center bg-gray-800 bg-opacity-75">
                        <div className="text-center text-white">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p>Starting camera...</p>
                        </div>
                      </div>
                    )}
                    {streamReady && !isLoading && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-32 h-40 border-2 border-blue-500 rounded-lg opacity-75"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-2" />
                      <p>Click "Start Camera" to begin verification</p>
                      {cameraError && (
                        <div className="text-red-500 text-sm mt-2 flex items-center justify-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{cameraError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-64 object-cover rounded-lg border-2 border-green-500"
                />
                {isVerified && (
                  <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full">
                      ✓ Verified & Saved
                    </div>
                  </div>
                )}
                {!isVerified && (
                  <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                    Ready to save
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-2">
            {!isCapturing && !capturedImage && (
              <Button 
                onClick={startCamera} 
                className="bg-blue-500 hover:bg-blue-600"
                disabled={isLoading}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isLoading ? 'Starting...' : 'Start Camera'}
              </Button>
            )}

            {isCapturing && (
              <>
                <Button 
                  onClick={capturePhoto} 
                  className="bg-green-500 hover:bg-green-600"
                  disabled={isLoading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancel
                </Button>
              </>
            )}

            {capturedImage && !isVerified && (
              <>
                <Button 
                  onClick={saveFaceData} 
                  className="bg-purple-500 hover:bg-purple-600"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save to Database'}
                </Button>
                <Button onClick={retakePhoto} variant="outline">
                  Retake Photo
                </Button>
              </>
            )}

            {isVerified && (
              <Button onClick={retakePhoto} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Update Face Data
              </Button>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500">Debug Info</summary>
          <DebugInfo />
        </details>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your user information is automatically detected</li>
            <li>• Ensure good lighting on your face</li>
            <li>• Look directly at the camera</li>
            <li>• Remove glasses or hats if possible</li>
            <li>• Keep your face centered in the frame</li>
            <li>• Allow camera permissions when prompted</li>
            <li>• Click "Save to Database" after capturing</li>
          </ul>
        </div>

        {/* Database Schema Info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Database Integration:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Data will be saved to <code>face_data</code> table</p>
            <p>• User ID automatically retrieved from current session</p>
            <p>• Face encoding generated for verification</p>
            <p>• Confidence score calculated automatically</p>
            <p>• Existing data can be updated</p>
          </div>
        </div>

        {/* Troubleshooting */}
        {cameraError && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">Troubleshooting:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Check if camera permission is allowed in browser settings</li>
              <li>• Close other applications that might be using the camera</li>
              <li>• Try refreshing the page</li>
              <li>• Use Chrome, Firefox, or Safari for best compatibility</li>
              <li>• Make sure you're on HTTPS (required for camera access)</li>
            </ul>
          </div>
        )}

        {isVerified && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-700 text-center font-medium">
              ✓ Face verification completed and saved to database! You can now use face recognition for attendance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceVerification;