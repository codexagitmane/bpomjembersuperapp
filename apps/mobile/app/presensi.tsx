import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Clock,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { extractApiErrorMessage, haversineDistanceMeter } from "@bpom/shared";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, radius } from "@/theme";

interface TitikKantor {
  slug: string;
  nama: string;
  latitude: number;
  longitude: number;
}

interface KantorInfo {
  titik_kantor: TitikKantor[];
  radius_meter: number;
  batas_absen: string;
  jadwal_hari_ini: {
    boleh_absen: boolean;
    alasan: string | null;
    jam_masuk: string | null;
    jam_pulang: string | null;
    shift_lintas_hari: boolean;
  };
}

type ModePresensi = "wfo" | "wfh" | "dinas";

const MODE_OPTIONS: { value: ModePresensi; label: string }[] = [
  { value: "wfo", label: "WFO" },
  { value: "wfh", label: "WFH" },
  { value: "dinas", label: "Dinas" },
];
interface PresensiHariIni {
  id: number;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status_masuk: string | null;
  status_keluar: string | null;
}
interface RiwayatItem extends PresensiHariIni {
  tanggal: string;
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  tepat_waktu: { label: "Tepat Waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_awal: { label: "Pulang Awal", tone: "warning" },
  di_luar_geofence: { label: "Di Luar Radius", tone: "danger" },
  lewat_batas: { label: "Lewat Batas", tone: "danger" },
};

export default function PresensiScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [kantor, setKantor] = useState<KantorInfo | null>(null);
  const [hariIni, setHariIni] = useState<PresensiHariIni | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<ModePresensi>("wfo");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [kantorRes, hariIniRes, riwayatRes] = await Promise.all([
      api.get("/presensi/kantor-info"),
      api.get("/presensi/hari-ini"),
      api.get("/presensi/riwayat"),
    ]);
    setKantor(kantorRes.data);
    setHariIni(hariIniRes.data.presensi);
    setRiwayat(riwayatRes.data.data ?? []);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const locate = useCallback(async () => {
    setLocating(true);
    setGeoError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan perangkat.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 });
    } catch {
      setGeoError("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const sudahCheckIn = !!hariIni?.jam_masuk;
  const sudahCheckOut = !!hariIni?.jam_keluar;
  const aksi: "check-in" | "check-out" | "selesai" = !sudahCheckIn
    ? "check-in"
    : !sudahCheckOut
      ? "check-out"
      : "selesai";

  const distance =
    coords && kantor && kantor.titik_kantor.length
      ? Math.min(
          ...kantor.titik_kantor.map((t) =>
            haversineDistanceMeter(coords.lat, coords.lng, t.latitude, t.longitude)
          )
        )
      : null;
  const diDalamRadius = distance !== null && kantor ? distance <= kantor.radius_meter : null;
  const jadwal = kantor?.jadwal_hari_ini;

  async function handleCapture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    setPhotoUri(photo.uri);
  }

  async function handleSubmit() {
    if (!coords || !photoUri) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const form = new FormData();
    form.append("mode", mode);
    form.append("latitude", String(coords.lat));
    form.append("longitude", String(coords.lng));
    form.append("accuracy_meter", String(Math.round(coords.accuracy)));
    form.append("foto", {
      uri: photoUri,
      name: `selfie-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob);

    try {
      await api.post(`/presensi/${aksi}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitSuccess(aksi === "check-in" ? "Presensi masuk berhasil dicatat!" : "Presensi pulang berhasil dicatat!");
      setPhotoUri(null);
      await loadData();
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.navy900} />
        </Pressable>
        <Text style={styles.headerTitle}>Presensi</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.navy400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.cardTitle}>Status Hari Ini</Text>
            <View style={styles.statusRow}>
              <StatusBox label="Masuk" jam={hariIni?.jam_masuk?.slice(0, 5) ?? "—"} status={hariIni?.status_masuk} />
              <StatusBox label="Pulang" jam={hariIni?.jam_keluar?.slice(0, 5) ?? "—"} status={hariIni?.status_keluar} />
            </View>
            {aksi === "selesai" && (
              <View style={styles.successBox}>
                <CheckCircle2 size={18} color={colors.bpom700} />
                <Text style={styles.successText}>Presensi hari ini sudah lengkap. Sampai jumpa besok!</Text>
              </View>
            )}
          </Card>

          {aksi !== "selesai" && (
            <Card>
              <Text style={styles.cardTitle}>
                {aksi === "check-in" ? "Presensi Masuk" : "Presensi Pulang"}
              </Text>

              {jadwal && !jadwal.boleh_absen && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#be123c" />
                  <Text style={styles.errorText}>{jadwal.alasan}</Text>
                </View>
              )}
              {jadwal?.boleh_absen && (
                <Text style={styles.jadwalText}>
                  Jadwal: {jadwal.jam_masuk} – {jadwal.jam_pulang}
                  {jadwal.shift_lintas_hari ? " (shift lintas hari)" : ""} • batas absen {kantor?.batas_absen} WIB
                </Text>
              )}

              <View style={styles.modeRow}>
                {MODE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={[styles.modeChip, mode === opt.value && styles.modeChipActive]}
                  >
                    <Text style={[styles.modeChipText, mode === opt.value && styles.modeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.locationRow}>
                <MapPin size={16} color={colors.navy600} />
                <View style={{ flex: 1 }}>
                  {locating && <Text style={styles.locationText}>Mendeteksi lokasi...</Text>}
                  {!locating && geoError && <Text style={styles.locationErrorText}>{geoError}</Text>}
                  {!locating && !geoError && distance !== null && (
                    <Text style={styles.locationText}>
                      Jarak dari kantor: <Text style={styles.locationBold}>{Math.round(distance)} m</Text>
                    </Text>
                  )}
                </View>
                {!locating && !geoError && diDalamRadius !== null && (
                  <Badge tone={diDalamRadius ? "success" : "danger"}>
                    {diDalamRadius ? "Dalam radius" : "Di luar radius"}
                  </Badge>
                )}
                <Pressable onPress={locate}>
                  <RefreshCw size={16} color={colors.navy400} />
                </Pressable>
              </View>

              <View style={styles.cameraWrap}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.cameraPreview} />
                ) : permission?.granted ? (
                  <CameraView ref={cameraRef} style={styles.cameraPreview} facing="front" />
                ) : (
                  <View style={[styles.cameraPreview, styles.permissionBox]}>
                    <Camera size={28} color={colors.navy300} />
                    <Text style={styles.permissionText}>Izin kamera diperlukan untuk selfie presensi</Text>
                    <Button title="Izinkan Kamera" onPress={requestPermission} variant="outline" />
                  </View>
                )}
              </View>

              {permission?.granted && (
                <View style={{ alignItems: "center", marginTop: 12 }}>
                  {photoUri ? (
                    <Button title="Ambil Ulang" variant="outline" onPress={() => setPhotoUri(null)} icon={<RotateCcw size={16} color={colors.navy900} />} />
                  ) : (
                    <Button title="Ambil Foto Selfie" onPress={handleCapture} icon={<Camera size={16} color="#fff" />} />
                  )}
                </View>
              )}

              {submitError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#be123c" />
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              )}
              {submitSuccess && (
                <View style={styles.successBox}>
                  <CheckCircle2 size={16} color={colors.bpom700} />
                  <Text style={styles.successText}>{submitSuccess}</Text>
                </View>
              )}

              <View style={{ marginTop: 16 }}>
                <Button
                  title={aksi === "check-in" ? "Presensi Masuk Sekarang" : "Presensi Pulang Sekarang"}
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={!coords || !photoUri}
                  icon={aksi === "check-in" ? <LogIn size={16} color="#fff" /> : <LogOut size={16} color="#fff" />}
                />
              </View>
            </Card>
          )}

          <Card>
            <View style={styles.riwayatHeader}>
              <Clock size={16} color={colors.navy900} />
              <Text style={styles.cardTitle}>Riwayat Presensi</Text>
            </View>
            {riwayat.length === 0 && <Text style={styles.emptyText}>Belum ada riwayat presensi.</Text>}
            {riwayat.map((r) => (
              <View key={r.id} style={styles.riwayatRow}>
                <View>
                  <Text style={styles.riwayatDate}>
                    {new Date(r.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                  </Text>
                  <Text style={styles.riwayatTime}>
                    {r.jam_masuk?.slice(0, 5) ?? "—"} – {r.jam_keluar?.slice(0, 5) ?? "—"}
                  </Text>
                </View>
                {r.status_masuk && (
                  <Badge tone={STATUS_LABEL[r.status_masuk]?.tone ?? "neutral"}>
                    {STATUS_LABEL[r.status_masuk]?.label ?? r.status_masuk}
                  </Badge>
                )}
              </View>
            ))}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusBox({ label, jam, status }: { label: string; jam: string; status?: string | null }) {
  const info = status ? STATUS_LABEL[status] : null;
  return (
    <View style={styles.statusBox}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusJam}>{jam}</Text>
      {info && <Badge tone={info.tone}>{info.label}</Badge>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.navy900 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.navy900, marginBottom: 12 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusBox: { flex: 1, backgroundColor: colors.navy50, borderRadius: radius.md, padding: 14, gap: 6 },
  statusLabel: { fontSize: 11, color: colors.navy400, fontWeight: "600" },
  statusJam: { fontSize: 20, fontWeight: "800", color: colors.navy900 },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bpom50,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
  },
  successText: { fontSize: 12.5, fontWeight: "600", color: colors.bpom700, flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.rose50,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontSize: 12.5, fontWeight: "600", color: "#be123c", flex: 1 },
  jadwalText: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.navy50,
  },
  modeChipActive: { backgroundColor: colors.navy900 },
  modeChipText: { fontSize: 13, fontWeight: "700", color: colors.navy600 },
  modeChipTextActive: { color: "#fff" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.navy50,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  locationText: { fontSize: 12, color: colors.navy700 },
  locationBold: { fontWeight: "800" },
  locationErrorText: { fontSize: 12, color: colors.rose500, fontWeight: "600" },
  cameraWrap: { alignItems: "center" },
  cameraPreview: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.navy950,
    overflow: "hidden",
  },
  permissionBox: { alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  permissionText: { fontSize: 12, color: colors.navy300, textAlign: "center" },
  riwayatHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, color: colors.navy400, textAlign: "center", paddingVertical: 20 },
  riwayatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
  },
  riwayatDate: { fontSize: 13, fontWeight: "700", color: colors.navy900 },
  riwayatTime: { fontSize: 11, color: colors.navy400, marginTop: 2 },
});
