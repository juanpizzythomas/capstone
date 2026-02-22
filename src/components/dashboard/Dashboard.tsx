import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, UserCheck, Users, User, FileText, CheckCircle, X, Camera, MapPin, AlertCircle } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { attendanceService } from '@/services/attendanceService';
import { geolocationService, LocationData, DistanceResult } from '@/services/geolocationService';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const formatTime = (time: any) => {
    if (!time) return '-';
    const s = String(time);
    if (s.toLowerCase().includes('invalid')) return '-';
    return s;
  };

  const formatDate = (date: any, raw: any) => {
    if (date && !String(date).toLowerCase().includes('invalid')) return date;
    if (!raw) return '-';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID');
    } catch {
      return '-';
    }
  };
  const { toast } = useToast();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<DistanceResult | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<{ pieData: any[], barData: any[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
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

    const location = await geolocationService.getCurrentLocation();
    const lat = location.latitude;
    const lon = location.longitude;

    try {
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
    } catch (err: any) {
      console.error("Check-in request error:", err);
      toast({
        title: "Check In Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  } catch (error) {
    console.error("Attendance processing error:", error);
    toast({
      title: "Check In Failed",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
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

    const location = await geolocationService.getCurrentLocation();
    const lat = location.latitude;
    const lon = location.longitude;

    try {
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
    } catch (err: any) {
      console.error("Check-out request error:", err);
      toast({
        title: "Check Out Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }

  } catch (error) {
    console.error("Checkout processing error:", error);
    toast({
      title: "Check Out Failed",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
    setIsProcessing(false);
  }
};

const [attendanceMode, setAttendanceMode] = useState<"checkin" | "checkout" | null>(null);
const [todayRecord, setTodayRecord] = useState<any>(null);

// Fetch summary for HR/Admin
useEffect(() => {
  if (user?.role === 'HR' || user?.role === 'Admin' || user?.role === 'Super Admin') {
    const fetchSummary = async () => {
      try {
        const res = await attendanceService.getSummary(dateFilter);
        setSummary(res);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      }
    };
    fetchSummary();
  }
}, [user, dateFilter]);

useEffect(() => {
  const fetchCharts = async () => {
    try {
      const data = await attendanceService.getChartData(dateFilter);
      setChartData(data);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    }
  };
  fetchCharts();
}, [dateFilter]);

useEffect(() => {
  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      let records;
      if (user?.role === 'Karyawan') {
        records = await attendanceService.getAttendanceHistory();
      } else {
        records = await attendanceService.getAllAttendance();
      }
      setAttendanceRecords(records);
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };
  fetchRecords();
}, [user]);

const filteredRecords = attendanceRecords.filter(record => {
  const matchesSearch = user?.role === 'Karyawan'
    ? true
    : (record.full_name || record.username || record.email || '').toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

  // Date input is YYYY-MM-DD, record date might be ISO or DD/MM/YYYY
  const matchesDate = !dateFilter ||
    (record.date && record.date.includes(dateFilter.split('-').reverse().join('/'))) ||
    (record.dateRaw && record.dateRaw.startsWith(dateFilter));

  return matchesSearch && matchesStatus && matchesDate;
});

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Present':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Present</Badge>;
    case 'Late':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">Late</Badge>;
    case 'Absent':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none">Absent</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

const exportToExcel = async () => {
  try {
    const blob = await attendanceService.exportAttendance();
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attendance_records.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    toast({
      title: "Export Failed",
      description: "Could not export attendance data",
      variant: "destructive",
    });
  }
};

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
      <div className={`grid grid-cols-1 ${user?.role === 'Karyawan' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-6`}>
        {user?.role === 'Karyawan' ? (
          stats ? (
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
          )
        ) : (
          summary ? (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalEmployees}</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{summary.presentToday}</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-600">Late Today</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{summary.lateToday}</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-600">Absent Today</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{summary.absentToday}</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-gray-500">Loading summary...</p>
          )
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Attendance Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Loading daily status charts...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Weekly Attendance Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Loading weekly attendance charts...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Attendance Records</span>
            </CardTitle>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              {user?.role !== 'Karyawan' && (
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-48"
                />
              )}

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full md:w-40"
              />

              {user?.role !== 'Karyawan' && (
                <Button
                  onClick={exportToExcel}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {user?.role !== 'Karyawan' && <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>}
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Check In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Check Out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Working Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecords ? (
                  <tr>
                    <td colSpan={user?.role === 'Karyawan' ? 5 : 6} className="text-center py-8 text-gray-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'Karyawan' ? 5 : 6} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <CalendarDays className="h-12 w-12 text-gray-400 mb-2" />
                        <h3 className="text-lg font-medium text-gray-900">No Records Found</h3>
                        <p className="text-gray-600">No attendance records match your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      {user?.role !== 'Karyawan' && (
                        <td className="py-3 px-4 font-medium">{record.full_name || record.username || record.email}</td>
                      )}
                      <td className="py-3 px-4">
                        {formatDate(record.date, record.dateRaw)}
                      </td>
                      <td className="py-3 px-4 font-mono">{formatTime(record.check_in_time)}</td>
                      <td className="py-3 px-4 font-mono">{formatTime(record.check_out_time)}</td>
                      <td className="py-3 px-4 font-mono">{formatTime(record.working_hours)}</td>
                      <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
