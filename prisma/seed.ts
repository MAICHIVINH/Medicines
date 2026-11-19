import { PrismaClient, AttributeDataType, MedicineStatus, VariantStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu khởi tạo dữ liệu gốc (Seeding Database)...');

  // ---------------------------------------------------------------------------
  // 1. TÀI KHOẢN ADMIN DUY NHẤT (4.8. AdminAccounts)
  // ---------------------------------------------------------------------------
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@pharmacatalog.vn';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Vinh260904@';
  const adminFullName = process.env.INITIAL_ADMIN_FULLNAME || 'Quản trị viên Hệ thống Dược điển';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingAdminCount = await prisma.adminAccount.count();
  let adminAccount;

  if (existingAdminCount === 0) {
    adminAccount = await prisma.adminAccount.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        fullName: adminFullName,
        isActive: true,
      },
    });
    console.log(`✅ Đã khởi tạo tài khoản Admin duy nhất: ${adminAccount.username} (${adminAccount.email})`);
  } else {
    adminAccount = await prisma.adminAccount.findFirstOrThrow();
    console.log(`ℹ️ Tài khoản Admin đã tồn tại (${adminAccount.username}), giữ nguyên cấu hình.`);
  }

  // ---------------------------------------------------------------------------
  // 2. THUỘC TÍNH ĐỘNG & TÙY CHỌN (4.5 & 4.6. VariantAttributes & Options)
  // ---------------------------------------------------------------------------
  const attributeDefinitions = [
    {
      name: 'Dạng bào chế',
      code: 'dosage_form',
      dataType: AttributeDataType.SELECT,
      unit: null,
      isFilterable: true,
      isRequired: true,
      sortOrder: 1,
      options: [
        { value: 'vien-nen', label: 'Viên nén', sortOrder: 1 },
        { value: 'vien-nen-bao-phim', label: 'Viên nén bao phim', sortOrder: 2 },
        { value: 'vien-sui', label: 'Viên sủi', sortOrder: 3 },
        { value: 'vien-nang-cung', label: 'Viên nang cứng', sortOrder: 4 },
        { value: 'vien-nang-mem', label: 'Viên nang mềm', sortOrder: 5 },
        { value: 'dung-dich-uong', label: 'Dung dịch uống', sortOrder: 6 },
        { value: 'bot-pha-hon-dich', label: 'Bột pha hỗn dịch uống', sortOrder: 7 },
        { value: 'kem-boi-da', label: 'Kem bôi ngoài da', sortOrder: 8 },
      ],
    },
    {
      name: 'Quy cách đóng gói',
      code: 'packaging',
      dataType: AttributeDataType.SELECT,
      unit: null,
      isFilterable: true,
      isRequired: true,
      sortOrder: 2,
      options: [
        { value: 'hop-10-vien', label: 'Hộp 1 vỉ x 10 viên', sortOrder: 1 },
        { value: 'hop-20-vien', label: 'Hộp 2 vỉ x 10 viên', sortOrder: 2 },
        { value: 'hop-30-vien', label: 'Hộp 3 vỉ x 10 viên (30 viên)', sortOrder: 3 },
        { value: 'hop-60-vien', label: 'Hộp 6 vỉ x 10 viên (60 viên)', sortOrder: 4 },
        { value: 'hop-100-vien', label: 'Hộp 10 vỉ x 10 viên (100 viên)', sortOrder: 5 },
        { value: 'tuyp-16-vien-sui', label: 'Tuýp 16 viên sủi', sortOrder: 6 },
        { value: 'chai-60ml', label: 'Chai 60ml', sortOrder: 7 },
        { value: 'chai-100ml', label: 'Chai 100ml', sortOrder: 8 },
        { value: 'hop-20-goi', label: 'Hộp 20 gói', sortOrder: 9 },
      ],
    },
    {
      name: 'Hàm lượng',
      code: 'strength',
      dataType: AttributeDataType.TEXT,
      unit: 'mg',
      isFilterable: true,
      isRequired: true,
      sortOrder: 3,
      options: [],
    },
    {
      name: 'Dung tích',
      code: 'volume',
      dataType: AttributeDataType.NUMBER,
      unit: 'ml',
      isFilterable: false,
      isRequired: false,
      sortOrder: 4,
      options: [],
    },
    {
      name: 'Hương vị',
      code: 'flavor',
      dataType: AttributeDataType.SELECT,
      unit: null,
      isFilterable: true,
      isRequired: false,
      sortOrder: 5,
      options: [
        { value: 'khong-mui-vi', label: 'Không hương vị (Tiêu chuẩn)', sortOrder: 1 },
        { value: 'huong-cam', label: 'Hương cam', sortOrder: 2 },
        { value: 'huong-dau', label: 'Hương dâu', sortOrder: 3 },
        { value: 'huong-bac-ha', label: 'Hương bạc hà', sortOrder: 4 },
      ],
    },
    {
      name: 'Không chứa đường (Sugar-free)',
      code: 'sugar_free',
      dataType: AttributeDataType.BOOLEAN,
      unit: null,
      isFilterable: true,
      isRequired: false,
      sortOrder: 6,
      options: [],
    },
  ];

  const attrMap: Record<string, { id: string; optionMap: Record<string, string> }> = {};

  for (const def of attributeDefinitions) {
    const attr = await prisma.variantAttribute.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        dataType: def.dataType,
        unit: def.unit,
        isFilterable: def.isFilterable,
        isRequired: def.isRequired,
        sortOrder: def.sortOrder,
        isActive: true,
      },
      create: {
        name: def.name,
        code: def.code,
        dataType: def.dataType,
        unit: def.unit,
        isFilterable: def.isFilterable,
        isRequired: def.isRequired,
        sortOrder: def.sortOrder,
        isActive: true,
      },
    });

    const optionMap: Record<string, string> = {};
    for (const opt of def.options) {
      const createdOpt = await prisma.variantAttributeOption.upsert({
        where: {
          variantAttributeId_value: {
            variantAttributeId: attr.id,
            value: opt.value,
          },
        },
        update: {
          label: opt.label,
          sortOrder: opt.sortOrder,
          isActive: true,
        },
        create: {
          variantAttributeId: attr.id,
          value: opt.value,
          label: opt.label,
          sortOrder: opt.sortOrder,
          isActive: true,
        },
      });
      optionMap[opt.value] = createdOpt.id;
    }

    attrMap[def.code] = { id: attr.id, optionMap };
  }
  console.log('✅ Đã khởi tạo các thuộc tính động (VariantAttributes & Options).');

  // ---------------------------------------------------------------------------
  // 3. DANH MỤC THUỐC CHA - CON (4.1. Categories)
  // ---------------------------------------------------------------------------
  const parentCategories = [
    {
      name: 'Thuốc giảm đau, hạ sốt, kháng viêm',
      slug: 'thuoc-giam-dau-ha-sot-khang-viem',
      description: 'Nhóm thuốc có tác dụng giảm đau, hạ sốt và chống viêm không steroid (NSAIDs) được Bộ Y tế cấp phép.',
      sortOrder: 1,
      children: [
        {
          name: 'Thuốc hạ sốt, giảm đau thông thường',
          slug: 'thuoc-ha-sot-giam-dau-thong-thuong',
          description: 'Các chế phẩm chứa Paracetamol đơn chất hoặc phối hợp.',
          sortOrder: 1,
        },
        {
          name: 'Thuốc kháng viêm không steroid (NSAIDs)',
          slug: 'thuoc-khang-viem-khong-steroid-nsaids',
          description: 'Các hoạt chất Ibuprofen, Meloxicam, Celecoxib, Diclofenac.',
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Thuốc tiêu hóa & Gan mật',
      slug: 'thuoc-tieu-hoa-gan-mat',
      description: 'Nhóm thuốc hỗ trợ và điều trị bệnh lý dạ dày - tá tràng, rối loạn tiêu hóa, gan mật.',
      sortOrder: 2,
      children: [
        {
          name: 'Thuốc dạ dày - tá tràng (Kháng acid, PPI)',
          slug: 'thuoc-da-day-ta-trang',
          description: 'Thuốc trung hòa acid dịch vị và thuốc ức chế bơm proton (Omeprazole, Esomeprazole).',
          sortOrder: 1,
        },
        {
          name: 'Men vi sinh & Bù nước điện giải',
          slug: 'men-vi-sinh-bu-nuoc-dien-giai',
          description: 'Cân bằng hệ vi sinh đường ruột và bù điện giải Oresol.',
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Thuốc hô hấp & Dị ứng',
      slug: 'thuoc-ho-hap-di-ung',
      description: 'Nhóm thuốc điều trị triệu chứng ho, long đờm và kháng histamin chống dị ứng.',
      sortOrder: 3,
      children: [
        {
          name: 'Thuốc kháng Histamin chống dị ứng',
          slug: 'thuoc-khang-histamin-chong-di-ung',
          description: 'Loratadine, Cetirizine, Fexofenadine giảm viêm mũi dị ứng, nổi mề đay.',
          sortOrder: 1,
        },
        {
          name: 'Thuốc ho & Long đờm',
          slug: 'thuoc-ho-long-dom',
          description: 'Acetylcysteine, Bromhexine, Ambroxol làm loãng đờm đường hô hấp.',
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Thuốc tim mạch & Huyết áp',
      slug: 'thuoc-tim-mach-huyet-ap',
      description: 'Nhóm thuốc kê đơn kiểm soát huyết áp, mỡ máu và bệnh lý tim mạch theo chỉ định bác sĩ.',
      sortOrder: 4,
      children: [],
    },
    {
      name: 'Vitamin & Khoáng chất thiết yếu',
      slug: 'vitamin-khoang-chat-thiet-yeu',
      description: 'Các chế phẩm bổ sung vi chất dinh dưỡng, Vitamin nhóm B, Vitamin C, Canxi, Kẽm.',
      sortOrder: 5,
      children: [],
    },
  ];

  const categoryMap: Record<string, string> = {};

  for (const parentDef of parentCategories) {
    const parent = await prisma.category.upsert({
      where: { slug: parentDef.slug },
      update: {
        name: parentDef.name,
        description: parentDef.description,
        sortOrder: parentDef.sortOrder,
        isActive: true,
        updatedBy: adminAccount.id,
      },
      create: {
        name: parentDef.name,
        slug: parentDef.slug,
        description: parentDef.description,
        sortOrder: parentDef.sortOrder,
        isActive: true,
        createdBy: adminAccount.id,
        updatedBy: adminAccount.id,
      },
    });
    categoryMap[parentDef.slug] = parent.id;

    for (const childDef of parentDef.children) {
      const child = await prisma.category.upsert({
        where: { slug: childDef.slug },
        update: {
          name: childDef.name,
          description: childDef.description,
          parentId: parent.id,
          sortOrder: childDef.sortOrder,
          isActive: true,
          updatedBy: adminAccount.id,
        },
        create: {
          name: childDef.name,
          slug: childDef.slug,
          description: childDef.description,
          parentId: parent.id,
          sortOrder: childDef.sortOrder,
          isActive: true,
          createdBy: adminAccount.id,
          updatedBy: adminAccount.id,
        },
      });
      categoryMap[childDef.slug] = child.id;
    }
  }
  console.log('✅ Đã khởi tạo hệ thống Danh mục thuốc cha-con (Categories).');

  // ---------------------------------------------------------------------------
  // 4. DANH MỤC THUỐC & BIẾN THỂ MẪU XÁC THỰC (4.2 & 4.4. Medicines & Variants)
  // ---------------------------------------------------------------------------
  const medicinesSeed = [
    {
      name: 'Hapacol 650 DHG Pharma',
      slug: 'hapacol-650-dhg-pharma',
      categorySlug: 'thuoc-ha-sot-giam-dau-thong-thuong',
      activeIngredient: 'Paracetamol 650mg',
      manufacturer: 'Công ty Cổ phần Dược Hậu Giang (DHG Pharma)',
      registrationNumber: 'VD-25551-16',
      isPrescriptionRequired: false,
      isFeatured: true,
      status: MedicineStatus.PUBLISHED,
      description:
        'Hapacol 650 là chế phẩm chứa hoạt chất Paracetamol 650mg do Dược Hậu Giang sản xuất theo tiêu chuẩn GMP-WHO. Thông tin được trích xuất từ tờ hướng dẫn sử dụng thuốc đã được Cục Quản lý Dược - Bộ Y tế phê duyệt.',
      usageInformation:
        'Thông tin từ tờ hướng dẫn sử dụng của nhà sản xuất: Dùng đường uống. Người lớn và trẻ em trên 12 tuổi uống theo liều quy định trong tờ hướng dẫn sử dụng, khoảng cách giữa các lần uống từ 4 đến 6 giờ. Vui lòng đọc kỹ hướng dẫn sử dụng hoặc tham khảo ý kiến bác sĩ/dược sĩ.',
      storageInformation:
        'Bảo quản nơi khô, nhiệt độ không quá 30°C, tránh ánh sáng trực tiếp.',
      variants: [
        {
          sku: 'DHG-HAP650-H100',
          name: 'Hapacol 650 - Hộp 10 vỉ x 10 viên nén bao phim',
          price: 95000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nen-bao-phim' },
            { code: 'packaging', optionValue: 'hop-100-vien' },
            { code: 'strength', textValue: '650mg' },
            { code: 'sugar_free', booleanValue: true },
          ],
        },
        {
          sku: 'DHG-HAP650-H30',
          name: 'Hapacol 650 - Hộp 3 vỉ x 10 viên nén bao phim',
          price: 32000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nen-bao-phim' },
            { code: 'packaging', optionValue: 'hop-30-vien' },
            { code: 'strength', textValue: '650mg' },
            { code: 'sugar_free', booleanValue: true },
          ],
        },
      ],
    },
    {
      name: 'Efferalgan 500mg UPSA SAS',
      slug: 'efferalgan-500mg-upsa-sas',
      categorySlug: 'thuoc-ha-sot-giam-dau-thong-thuong',
      activeIngredient: 'Paracetamol 500mg',
      manufacturer: 'UPSA SAS (Pháp)',
      registrationNumber: 'VN-21426-18',
      isPrescriptionRequired: false,
      isFeatured: true,
      status: MedicineStatus.PUBLISHED,
      description:
        'Efferalgan 500mg dạng viên nén sủi bọt hòa tan nhanh trong nước, sản xuất bởi UPSA SAS (Pháp). Dữ liệu tra cứu phục vụ mục đích tham khảo thông tin dược phẩm đã đăng ký lưu hành.',
      usageInformation:
        'Thông tin từ nhà sản xuất: Hòa tan hoàn toàn viên sủi trong một cốc nước (khoảng 200ml) trước khi uống. Không nhai hoặc nuốt nguyên viên sủi.',
      storageInformation:
        'Bảo quản ở nhiệt độ dưới 30°C, đậy kín nắp tuýp sau khi lấy thuốc để tránh ẩm.',
      variants: [
        {
          sku: 'UPSA-EFF500-T16',
          name: 'Efferalgan 500mg - Hộp 1 tuýp x 16 viên sủi',
          price: 54000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-sui' },
            { code: 'packaging', optionValue: 'tuyp-16-vien-sui' },
            { code: 'strength', textValue: '500mg' },
            { code: 'flavor', optionValue: 'khong-mui-vi' },
          ],
        },
      ],
    },
    {
      name: 'Nexium Mups 40mg AstraZeneca',
      slug: 'nexium-mups-40mg-astrazeneca',
      categorySlug: 'thuoc-da-day-ta-trang',
      activeIngredient: 'Esomeprazole (dưới dạng Esomeprazole magnesi trihydrat) 40mg',
      manufacturer: 'AstraZeneca AB (Thụy Điển)',
      registrationNumber: 'VN-19782-16',
      isPrescriptionRequired: true,
      isFeatured: true,
      status: MedicineStatus.PUBLISHED,
      description:
        'Nexium Mups 40mg là thuốc kê đơn chứa hoạt chất Esomeprazole bào chế dưới dạng hệ vi hạt (MUPS) kháng dịch vị dạ dày, sản xuất bởi AstraZeneca AB.',
      usageInformation:
        'Thuốc kê đơn (Rx): Chỉ sử dụng khi có đơn chỉ định của bác sĩ chuyên khoa. Nuốt nguyên viên cùng với chất lỏng, không được nhai hoặc nghiền nát các vi hạt.',
      storageInformation:
        'Bảo quản ở nhiệt độ không quá 30°C, giữ trong vỉ nhôm nguyên gốc để tránh ẩm.',
      variants: [
        {
          sku: 'AZ-NEX40-H20',
          name: 'Nexium Mups 40mg - Hộp 2 vỉ x 10 viên nén kháng dịch vị',
          price: 490000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nen-bao-phim' },
            { code: 'packaging', optionValue: 'hop-20-vien' },
            { code: 'strength', textValue: '40mg' },
          ],
        },
      ],
    },
    {
      name: 'Telfast HD 180mg Sanofi',
      slug: 'telfast-hd-180mg-sanofi',
      categorySlug: 'thuoc-khang-histamin-chong-di-ung',
      activeIngredient: 'Fexofenadine Hydrochloride 180mg',
      manufacturer: 'Công ty Cổ phần Sanofi Việt Nam',
      registrationNumber: 'VD-25483-16',
      isPrescriptionRequired: false,
      isFeatured: true,
      status: MedicineStatus.PUBLISHED,
      description:
        'Telfast HD 180mg chứa hoạt chất kháng histamin thế hệ 2 Fexofenadine HCl 180mg, sản xuất tại nhà máy đạt chuẩn GMP của Sanofi.',
      usageInformation:
        'Thông tin từ tờ hướng dẫn sử dụng: Uống với nước trước bữa ăn. Không uống cùng với nước hoa quả (như nước cam, nước bưởi, nước táo).',
      storageInformation:
        'Bảo quản nơi khô mát, nhiệt độ dưới 30°C, tránh ẩm.',
      variants: [
        {
          sku: 'SNF-TEL180-H10',
          name: 'Telfast HD 180mg - Hộp 1 vỉ x 10 viên nén bao phim',
          price: 82000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nen-bao-phim' },
            { code: 'packaging', optionValue: 'hop-10-vien' },
            { code: 'strength', textValue: '180mg' },
          ],
        },
        {
          sku: 'SNF-TEL180-H30',
          name: 'Telfast HD 180mg - Hộp 3 vỉ x 10 viên nén bao phim',
          price: 235000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nen-bao-phim' },
            { code: 'packaging', optionValue: 'hop-30-vien' },
            { code: 'strength', textValue: '180mg' },
          ],
        },
      ],
    },
    {
      name: 'Acemuc 200mg Sanofi',
      slug: 'acemuc-200mg-sanofi',
      categorySlug: 'thuoc-ho-long-dom',
      activeIngredient: 'Acetylcysteine 200mg',
      manufacturer: 'Công ty Cổ phần Sanofi Việt Nam',
      registrationNumber: 'VD-21950-14',
      isPrescriptionRequired: false,
      isFeatured: false,
      status: MedicineStatus.PUBLISHED,
      description:
        'Acemuc 200mg chứa hoạt chất tiêu chất nhầy Acetylcysteine 200mg, hương cam dễ uống.',
      usageInformation:
        'Hòa tan cốm trong nửa ly nước trước khi uống. Đọc kỹ tờ hướng dẫn sử dụng đi kèm hộp thuốc.',
      storageInformation:
        'Bảo quản ở nhiệt độ dưới 30°C, nơi khô ráo.',
      variants: [
        {
          sku: 'SNF-ACE200-H30',
          name: 'Acemuc 200mg - Hộp 30 viên nang cứng',
          price: 78000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-nang-cung' },
            { code: 'packaging', optionValue: 'hop-30-vien' },
            { code: 'strength', textValue: '200mg' },
            { code: 'flavor', optionValue: 'huong-cam' },
          ],
        },
      ],
    },
    {
      name: 'Berocca Performance Mango Bayer',
      slug: 'berocca-performance-mango-bayer',
      categorySlug: 'vitamin-khoang-chat-thiet-yeu',
      activeIngredient: 'Vitamin nhóm B, Vitamin C 500mg, Canxi, Magie, Kẽm',
      manufacturer: 'PT Bayer Indonesia',
      registrationNumber: 'VN-22104-19',
      isPrescriptionRequired: false,
      isFeatured: true,
      status: MedicineStatus.PUBLISHED,
      description:
        'Viên sủi bổ sung Vitamin nhóm B kết hợp Vitamin C, Canxi, Magie và Kẽm chính hãng Bayer.',
      usageInformation:
        'Hòa tan 1 viên sủi trong 200ml nước uống mỗi ngày theo hướng dẫn của nhà sản xuất.',
      storageInformation:
        'Đậy nắp tuýp kín sau khi sử dụng, bảo quản dưới 25°C.',
      variants: [
        {
          sku: 'BAY-BER-T10',
          name: 'Berocca Performance - Tuýp 10 viên sủi hương cam',
          price: 105000,
          attributes: [
            { code: 'dosage_form', optionValue: 'vien-sui' },
            { code: 'packaging', optionValue: 'hop-10-vien' },
            { code: 'strength', textValue: '500mg Vitamin C' },
            { code: 'flavor', optionValue: 'huong-cam' },
            { code: 'sugar_free', booleanValue: true },
          ],
        },
      ],
    },
  ];

  for (const medDef of medicinesSeed) {
    const categoryId = categoryMap[medDef.categorySlug];
    if (!categoryId) continue;

    const medicine = await prisma.medicine.upsert({
      where: { slug: medDef.slug },
      update: {
        name: medDef.name,
        categoryId,
        activeIngredient: medDef.activeIngredient,
        manufacturer: medDef.manufacturer,
        registrationNumber: medDef.registrationNumber,
        description: medDef.description,
        usageInformation: medDef.usageInformation,
        storageInformation: medDef.storageInformation,
        isPrescriptionRequired: medDef.isPrescriptionRequired,
        isFeatured: medDef.isFeatured,
        status: medDef.status,
        publishedAt: medDef.status === MedicineStatus.PUBLISHED ? new Date() : null,
        updatedBy: adminAccount.id,
      },
      create: {
        name: medDef.name,
        slug: medDef.slug,
        categoryId,
        activeIngredient: medDef.activeIngredient,
        manufacturer: medDef.manufacturer,
        registrationNumber: medDef.registrationNumber,
        description: medDef.description,
        usageInformation: medDef.usageInformation,
        storageInformation: medDef.storageInformation,
        isPrescriptionRequired: medDef.isPrescriptionRequired,
        isFeatured: medDef.isFeatured,
        status: medDef.status,
        publishedAt: medDef.status === MedicineStatus.PUBLISHED ? new Date() : null,
        createdBy: adminAccount.id,
        updatedBy: adminAccount.id,
      },
    });

    for (const varDef of medDef.variants) {
      const variant = await prisma.medicineVariant.upsert({
        where: { sku: varDef.sku },
        update: {
          medicineId: medicine.id,
          name: varDef.name,
          price: varDef.price,
          status: VariantStatus.ACTIVE,
        },
        create: {
          medicineId: medicine.id,
          sku: varDef.sku,
          name: varDef.name,
          price: varDef.price,
          status: VariantStatus.ACTIVE,
        },
      });

      for (const attrVal of varDef.attributes) {
        const attrInfo = attrMap[attrVal.code];
        if (!attrInfo) continue;

        const optionId =
          'optionValue' in attrVal && attrVal.optionValue
            ? attrInfo.optionMap[attrVal.optionValue] || null
            : null;
        const textValue = 'textValue' in attrVal ? attrVal.textValue ?? null : null;
        const booleanValue = 'booleanValue' in attrVal ? attrVal.booleanValue ?? null : null;

        await prisma.variantAttributeValue.upsert({
          where: {
            medicineVariantId_variantAttributeId: {
              medicineVariantId: variant.id,
              variantAttributeId: attrInfo.id,
            },
          },
          update: {
            variantAttributeOptionId: optionId,
            textValue,
            booleanValue,
          },
          create: {
            medicineVariantId: variant.id,
            variantAttributeId: attrInfo.id,
            variantAttributeOptionId: optionId,
            textValue,
            booleanValue,
          },
        });
      }
    }
  }

  console.log('✅ Đã khởi tạo dữ liệu Thuốc và Biến thể chuẩn (Medicines & MedicineVariants).');
  console.log('🎉 Hoàn tất quá trình Seeding Database!');
}

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy Seed Database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

