"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Mail, Phone, IdCard, BadgeCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, type RoleSlug } from "@bpom/shared";

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">Profil Saya</h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-950 text-2xl font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900">{user.name}</h2>
            <Badge tone="info" className="mt-1.5">
              {ROLE_LABELS[user.role as RoleSlug] ?? user.role}
            </Badge>
          </div>
        </Card>

        <Card className="mt-4 divide-y divide-navy-900/5 !p-0">
          <InfoRow icon={<Mail className="size-4" />} label="Email" value={user.email} />
          {user.nip_nik && (
            <InfoRow icon={<IdCard className="size-4" />} label="NIP / NIK" value={user.nip_nik} />
          )}
          {user.phone && <InfoRow icon={<Phone className="size-4" />} label="Nomor HP" value={user.phone} />}
          <InfoRow
            icon={<BadgeCheck className="size-4" />}
            label="Status Akun"
            value={user.is_active ? "Aktif" : "Nonaktif"}
          />
        </Card>

        <Button
          variant="danger"
          size="lg"
          onClick={handleLogout}
          loading={loggingOut}
          className="mt-6 w-full"
        >
          {!loggingOut && <LogOut className="size-4" />}
          Keluar dari Akun
        </Button>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500">
        {icon}
      </span>
      <div>
        <p className="text-xs text-navy-400">{label}</p>
        <p className="text-sm font-semibold text-navy-900">{value}</p>
      </div>
    </div>
  );
}
