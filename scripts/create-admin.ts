import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const username = args[0];
  const email = args[1];
  const password = args[2];
  const fullName = args[3];

  console.log(`\n======================================================`);
  console.log(`⏳ Đang khởi tạo tài khoản Admin mới...`);
  console.log(`   - Username : ${username}`);
  console.log(`   - Email    : ${email}`);
  console.log(`   - Họ tên   : ${fullName}`);
  console.log(`   - Mật khẩu : ${password}`);
  console.log(`======================================================\n`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminAccount.upsert({
    where: { username },
    update: {
      email,
      fullName,
      passwordHash,
      isActive: true,
    },
    create: {
      username,
      email,
      fullName,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`✅ TẠO TÀI KHOẢN ADMIN THÀNH CÔNG!`);
  console.log(`   - Admin ID : ${admin.id}`);
  console.log(`   - Username : ${admin.username}`);
  console.log(`   - Email    : ${admin.email}`);
  console.log(`   - Trạng thái: ${admin.isActive ? 'Đang kích hoạt (ACTIVE)' : 'Đã khóa'}`);
  console.log(`\n👉 Bạn có thể đăng nhập ngay tại: http://localhost:3000/login\n`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi tạo tài khoản admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
