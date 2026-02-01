import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, UserCheck, Users, User, FileText, CheckCircle, X, Camera, MapPin, AlertCircle } from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { geolocationService, LocationData, DistanceResult } from '@/services/geolocationService';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<DistanceResult | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clean up camera stream on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Monitor user location in real-time
  useEffect(() => {
    if (user?.role === 'Karyawan') {
      const watchId = geolocationService.watchLocation((location) => {
        setCurrentLocation(location);
        const distance = geolocationService.calculateDistance(location.latitude, location.longitude);
        setDistanceInfo(distance);

        // Show notification if user is outside check-in range but within notification range
        if (distance.status === 'near-office' && !isCheckedIn) {
          toast({
            title: "Hampir Sampai Kantor",
            description: distance.message,
            variant: "default"
          });
        } else if (distance.status === 'far-office' && !isCheckedIn) {
          toast({
            title: "Terlalu Jauh dari Kantor",
            description: distance.message,
            variant: "destructive"
          });
        }
      });

      setLocationWatchId(watchId);

      return () => {
        if (watchId) {
          geolocationService.clearWatch(watchId);
        }
      };
    }
  }, [user, isCheckedIn, toast]);

  const startCamera = useCallback(async () => {
    try {
      setShowCamera(true);
      setCameraReady(false);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        const video = videoRef.current;
        video.onloadedmetadata = () => setCameraReady(true);
        await video.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      setShowCamera(false);
      setCameraReady(false);

      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const freezeCamera = useCallback(() => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop()); // hentikan stream
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null; // biar frame terakhir stay
  }
  setCameraReady(false); // nonaktifkan tombol confirm
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setShowCamera(false);
    setIsProcessing(false);
  }, [stream]);

  const captureImage = useCallback((): string | null => {
  if (!videoRef.current || !canvasRef.current) return null;

  const video = videoRef.current;
  const canvas = canvasRef.current;

  // ✅ Pastikan ukuran video valid
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.error("Video not ready, no frame captured");
    return null;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  console.log("Captured image length:", dataUrl.length);

  return dataUrl;
}, []);

  function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
  });
}

const processAttendance = async () => {
  if (!cameraReady || isProcessing) return;
  setIsProcessing(true);

  try {
    const imageData = captureImage();
    if (!imageData) throw new Error("Failed to capture image");

    freezeCamera(); // ✅ freeze frame, jangan close modal

    // Mengambil koordinat menggunakan browser navigator object untuk geotagging
    const location = await geolocationService.getCurrentLocation();
    const lat = location.latitude;
    const lon = location.longitude;

    const res = await attendanceService.checkIn(imageData, lat, lon);
    console.log("Check-in response:", res);

    if (res.success) {
      setIsCheckedIn(true);          // tandai sudah checkin
      setAttendanceMode("checkout"); // ubah tombol jadi checkout
      toast({
        title: "Check In Successful",
        description: `You have successfully checked in at ${new Date().toLocaleTimeString()}`,
      });
      stopCamera();
    } else {
      setIsCheckedIn(false);         // gagal → tetap dianggap belum checkin
      setAttendanceMode("checkin");
      toast({
        title: "Check In Failed",
        description: res.error || "Face not recognized or location invalid",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Attendance processing error:", error);
    toast({
      title: "Check In Failed",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

  const processCheckout = async () => {
  if (!cameraReady || isProcessing) return;
  setIsProcessing(true);

  try {
    const imageData = captureImage();
    if (!imageData) throw new Error("Failed to capture image");

    freezeCamera(); // ✅ freeze frame setelah capture

    // Mengambil koordinat menggunakan browser navigator object untuk geotagging
    const location = await geolocationService.getCurrentLocation();
    const lat = location.latitude;
    const lon = location.longitude;

    const res = await attendanceService.checkOut(imageData, lat, lon);
    console.log("Check-out response:", res);

    if (res.success) {
      setIsCheckedIn(false);        // tandai sudah checkout
      setAttendanceMode("checkin"); // tombol kembali checkin
      stopCamera();
      toast({
        title: "Check Out Successful",
        description: `You have successfully checked out at ${new Date().toLocaleTimeString()}`,
      });
    } else {
      setIsCheckedIn(true);         // gagal checkout → user tetap dianggap checkin
      setAttendanceMode("checkout");
      toast({
        title: "Check Out Failed",
        description: res.error || "Face not recognized or location invalid",
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error("Checkout processing error:", error);
    toast({
      title: "Check Out Failed",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

const [attendanceMode, setAttendanceMode] = useState<"checkin" | "checkout" | null>(null);
const [todayRecord, setTodayRecord] = useState<any>(null);

// 🔹 Sinkronkan status checkin/checkout dari backend
useEffect(() => {
  const fetchTodayAttendance = async () => {
    try {
      const today = await attendanceService.getTodayAttendance();

      if (today) {
        if (today.check_in_time && !today.check_out_time) {
          setIsCheckedIn(true);            // ✅ tandai sudah checkin
          setAttendanceMode("checkout");   // tombol jadi checkout
        } else if (today.check_in_time && today.check_out_time) {
          setIsCheckedIn(false);           // ✅ sudah checkout, jadi bukan checked in lagi
          setAttendanceMode(null);         // tombol disabled
        } else {
          setIsCheckedIn(false);           
          setAttendanceMode("checkin");    // belum checkin
        }
      } else {
        setIsCheckedIn(false);             
        setAttendanceMode("checkin");      // default kalau belum ada record
      }

    } catch (err) {
      console.error("Error fetching today's attendance:", err);
      setIsCheckedIn(false);               
      setAttendanceMode("checkin");        // fallback
    }
  };

  if (user?.role === "Karyawan") {
    fetchTodayAttendance();
  }
}, [user]);


const handleCheckIn = async () => {
  if (user?.role === 'Karyawan' && !user?.faceVerified) {
    toast({
      title: "Face Verification Required",
      description: "Please complete face verification in your profile first",
      variant: "destructive"
    });
    return;
  }

  // Check location first
  if (!distanceInfo || !distanceInfo.canCheckIn) {
    toast({
      title: "Tidak Bisa Check In",
      description: distanceInfo?.message || "Anda terlalu jauh dari kantor untuk melakukan absen",
      variant: "destructive"
    });
    return;
  }

  setAttendanceMode("checkin");
  await startCamera();
};

const handleCheckOut = async () => {
  if (user?.role === 'Karyawan' && !user?.faceVerified) {
    toast({
      title: "Face Verification Required",
      description: "Please complete face verification in your profile first",
      variant: "destructive"
    });
    return;
  }

  // Check location first
  if (!distanceInfo || !distanceInfo.canCheckIn) {
    toast({
      title: "Tidak Bisa Check Out",
      description: distanceInfo?.message || "Anda terlalu jauh dari kantor untuk melakukan absen",
      variant: "destructive"
    });
    return;
  }

  setAttendanceMode("checkout");
  await startCamera();
};

const [stats, setStats] = useState<{ 
  monthAttendance: string; 
  onTimeRate: string; 
  totalWorkingDays: number;
} | null>(null);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const history = await attendanceService.getAttendanceHistory();

      // 🔹 Hitung total working days (jumlah record bulan ini)
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();

      const monthlyRecords = history.filter(record => {
        //const d = new Date(record.date);
        const d = new Date(record.dateRaw);
        return d.getMonth() === month && d.getFullYear() === year;
      });

      // 🔹 Hitung total hari kerja bulan berjalan (Senin - Jumat)
const getWorkingDaysInMonth = (year: number, month: number) => {
  let count = 0;
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // exclude Minggu (0) & Sabtu (6)
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
};

const totalWorkingDays = getWorkingDaysInMonth(year, month);
const attendedDays = monthlyRecords.filter(r => r.check_in_time).length;


      // 🔹 Attendance ratio
      const monthAttendance = `${attendedDays}/${totalWorkingDays}`;

      // 🔹 On time rate (anggap "Late" di backend status = 'Late')
      const onTimeCount = monthlyRecords.filter(r => r.status !== 'Late' && r.status !== 'Absent').length;
      const onTimeRate = totalWorkingDays > 0 
        ? `${Math.round((onTimeCount / totalWorkingDays) * 100)}%`
        : '0%';

      setStats({
        monthAttendance,
        onTimeRate,
        totalWorkingDays
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  if (user?.role === "Karyawan") {
    fetchStats();
  }
}, [user]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {user?.role === 'Karyawan' && (
          <div className="flex gap-3">
            {!isCheckedIn ? (
              <Button
                onClick={handleCheckIn}
                className="h-12 px-6 bg-green-500 hover:bg-green-600"
                disabled={showCamera || (distanceInfo && !distanceInfo.canCheckIn)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {showCamera ? 'Camera Active' : 'Check In'}
              </Button>
            ) : (
              <Button
                onClick={handleCheckOut}
                className="h-12 px-6 bg-red-500 hover:bg-red-600"
                disabled={distanceInfo && !distanceInfo.canCheckIn}
              >
                Check Out
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-w-[90vw]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-center flex-1">
                {attendanceMode === "checkin" ? "Face Recognition Check-In" : "Face Recognition Check-Out"}
                </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopCamera}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-64 object-cover" />
                {!cameraReady && (
                  <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-600">Loading camera...</p>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <p className="text-white">Recognizing face...</p>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <Button
                  onClick={attendanceMode === "checkin" ? processAttendance : processCheckout}
                  className={attendanceMode === "checkin" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
                  disabled={!cameraReady || isProcessing}
                >
                  {isProcessing ? "Processing..." : attendanceMode === "checkin" ? "Confirm Check-In" : "Confirm Check-Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Location Status Card */}
      {user?.role === 'Karyawan' && distanceInfo && (
        <Card className={`border-2 ${distanceInfo.canCheckIn ? 'border-green-500' : distanceInfo.status === 'near-office' ? 'border-yellow-500' : 'border-red-500'}`}>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full ${distanceInfo.canCheckIn ? 'bg-green-100' : distanceInfo.status === 'near-office' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <MapPin className={`h-6 w-6 ${distanceInfo.canCheckIn ? 'text-green-600' : distanceInfo.status === 'near-office' ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">Status Lokasi</h3>
                  {distanceInfo.canCheckIn ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Dalam Jangkauan</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Diluar Jangkauan</span>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{distanceInfo.message}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Jarak: {geolocationService.formatDistance(distanceInfo.distance)}</span>
                  </div>
                  {currentLocation && (
                    <div className="text-xs text-gray-500">
                      Akurasi: {Math.round(currentLocation.accuracy)}m
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {stats ? (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month Attendance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.monthAttendance}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Time Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.onTimeRate}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Working Days</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalWorkingDays}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      ) : (
        <p className="text-gray-500">Loading stats...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
