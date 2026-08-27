"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, ShieldX, Loader2 } from "lucide-react";
import { LenteraMark } from "@/components/Logo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Data {
  valid: boolean;
  nama?: string;
  nip?: string | null;
  jabatan?: string | null;
}

export default function VerifyTtdPage() {
  const params = useParams();
  const kode = String(params?.kode ?? "");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/publik/ttd/${encodeURIComponent(kode)}`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ valid: false }))
      .finally(() => setLoading(false));
  }, [kode]);

  return (
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-50">
          <LenteraMark className="size-10" />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Verifikasi Tanda Tangan • LENTERA BPOM Jember
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-navy-300" />
          </div>
        ) : data?.valid ? (
          <div className="mt-5">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-bpom-50 text-bpom-600">
              <BadgeCheck className="size-7" />
            </div>
            <p className="mt-3 text-xs font-semibold text-bpom-600">TANDA TANGAN SAH</p>
            <h1 className="mt-1 text-xl font-extrabold text-navy-900">{data.nama}</h1>
            <div className="mt-4 space-y-2 text-left">
              <Field label="NIP / NIK" value={data.nip ?? "—"} />
              <Field label="Jabatan" value={data.jabatan ?? "—"} />
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <ShieldX className="size-7" />
            </div>
            <p className="mt-3 font-bold text-navy-800">Tidak Ditemukan</p>
            <p className="mt-1 text-sm text-navy-400">Tanda tangan tidak valid atau sudah dinonaktifkan.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-50/60 px-4 py-2.5">
      <p className="text-[11px] font-medium text-navy-400">{label}</p>
      <p className="font-semibold text-navy-900">{value}</p>
    </div>
  );
}
