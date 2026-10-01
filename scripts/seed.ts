// Seed script for a fresh database. For an existing migrated database, no seed is needed.
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { DEFAULT_USER_PERMISSIONS, serializePermissions } from "../src/lib/permissions";

async function main() {
  console.log("Seeding Escloud database...");

  const adminEmail = process.env.ESCLOUD_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ESCLOUD_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    if (adminPassword.length < 8) {
      throw new Error("ESCLOUD_ADMIN_PASSWORD must contain at least 8 characters.");
    }
    const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await db.user.create({
        data: {
          username: process.env.ESCLOUD_ADMIN_USERNAME?.trim() || "admin",
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          displayName: process.env.ESCLOUD_ADMIN_NAME?.trim() || "Escloud Administrator",
          role: "admin",
          status: "active",
          mustChangePwd: true,
          permissions: serializePermissions([...DEFAULT_USER_PERMISSIONS, "admin"]),
          storageQuota: BigInt(1024 * 1024 * 1024 * 1024),
          uploadMaxBytes: BigInt(100 * 1024 * 1024 * 1024),
        },
      });
      console.log(`Created admin: ${adminEmail}`);
    } else {
      console.log(`Admin already exists: ${adminEmail}`);
    }
  } else {
    console.log("Admin creation skipped. Set ESCLOUD_ADMIN_EMAIL and ESCLOUD_ADMIN_PASSWORD to create a fresh admin.");
  }

  const defaults: Record<string, string> = {
    "app.name": "Escloud",
    "app.theme": "system",
    "video.advanced_default": "on",
    "video.default_quality": "auto",
    "video.pre_buffer_level": "adaptive",
    "video.data_saver_default": "off",
    "upload.approval_required": "off",
    "session.timeout_minutes": "43200",
    "qr.ttl_seconds": "180",
    "registration.enabled": "off",
    "maintenance.mode": "off",
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = await db.systemSetting.findUnique({ where: { key } });
    if (!existing) await db.systemSetting.create({ data: { key, value } });
  }

  console.log("System settings seeded.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
