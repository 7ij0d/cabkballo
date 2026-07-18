import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.returnLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.employee.deleteMany({});

  // 2. Create Employees: Anas and Taha
  const passwordHashAnas = await bcrypt.hash('anas2026', 10);
  const passwordHashTaha = await bcrypt.hash('taha2026', 10);

  const anas = await prisma.employee.create({
    data: {
      username: 'anas',
      name: 'أنس',
      passwordHash: passwordHashAnas,
    },
  });

  const taha = await prisma.employee.create({
    data: {
      username: 'taha',
      name: 'طه',
      passwordHash: passwordHashTaha,
    },
  });

  console.log('Created employees: Anas and Taha');

  // 3. Create Customers
  const customerData = [
    { name: 'محمد عبد الله', phone: '0912345678', notes: 'زبون دائم، يفضل جودة ممتاز' },
    { name: 'أحمد الورفلي', phone: '0923456789', notes: 'طلب مستعجل لحفل تخرج جامعة طرابلس' },
    { name: 'سارة الترهوني', phone: '0918765432', notes: 'مجموعة من 5 طالبات' },
    { name: 'فاطمة العبيدي', phone: '0945678901', notes: 'تريد تطريز خاص على الوشاح' },
    { name: 'علي الزنتاني', phone: '0929876543', notes: 'طلب إيجار قبعة ووشاح' },
  ];

  const customers = [];
  for (const c of customerData) {
    const cust = await prisma.customer.create({ data: c });
    customers.push(cust);
  }

  console.log(`Created ${customers.length} customers`);

  // 4. Create Orders
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const pastWeek = new Date(today);
  pastWeek.setDate(today.getDate() - 5);

  // Order 1: Sales and Rentals mix, partially paid (Customer 1, Employee: Anas)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-0001',
      customerId: customers[0].id,
      employeeId: anas.id,
      orderDate: pastWeek,
      status: 'Ready',
      notes: 'توصيل إلى مكان الحفل',
      subtotal: 350.0,
      discount: 20.0,
      grandTotal: 330.0,
      totalPaid: 150.0,
      remainingBalance: 180.0,
      paymentStatus: 'PartiallyPaid',
    },
  });

  // Items for Order 1
  // Item 1: Kuwaiti Cap (Sale)
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      category: 'Graduation Cap',
      capType: 'Kuwaiti Cap',
      capColor: 'Gold',
      quantity: 2,
      unitPrice: 50.0, // Total = 100
      deliveryDate: today,
      notes: 'تأكيد اللون الذهبي اللامع',
      status: 'Ready',
    },
  });

  // Item 2: Graduation Hat (Rental)
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      category: 'Graduation Hat',
      operationType: 'Rental',
      quantity: 5,
      unitPrice: 30.0, // Rental Price, Total = 150
      depositAmount: 20.0, // Deposit per item, Total = 100
      deliveryDate: today,
      returnDate: nextWeek,
      notes: 'إيجار قبعات تخرج سادة',
      status: 'Ready',
    },
  });

  // Item 3: Graduation Sash (Sale - Embroidery)
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      category: 'Graduation Sash',
      operationType: 'Sale',
      saleType: 'Embroidery',
      quantity: 2,
      unitPrice: 50.0, // Total = 100
      deliveryDate: today,
      notes: 'تطريز اسم محمد وأسماء أخرى',
      status: 'Ready',
      graduationDate: nextWeek,
    },
  });

  // Payments for Order 1
  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 150.0,
      paymentDate: pastWeek,
      paymentMethod: 'Cash',
      notes: 'دفعة أولى عربون لتأكيد الطلب',
      employeeId: anas.id,
    },
  });

  // Order 2: Fully paid, Delivered (Customer 2, Employee: Taha)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-0002',
      customerId: customers[1].id,
      employeeId: taha.id,
      orderDate: pastWeek,
      status: 'Delivered',
      notes: 'تم التسليم يدوياً في المعرض',
      subtotal: 250.0,
      discount: 0.0,
      grandTotal: 250.0,
      totalPaid: 250.0,
      remainingBalance: 0.0,
      paymentStatus: 'FullyPaid',
    },
  });

  // Item for Order 2: TLC Cap
  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      category: 'Graduation Cap',
      capType: 'TLC Cap',
      capSize: '2',
      quantity: 5,
      unitPrice: 50.0,
      deliveryDate: pastWeek,
      notes: 'قبعة قياس 2 مع الشارة',
      status: 'Delivered',
    },
  });

  // Payments for Order 2
  await prisma.payment.create({
    data: {
      orderId: order2.id,
      amount: 100.0,
      paymentDate: pastWeek,
      paymentMethod: 'Bank Transfer',
      notes: 'عربون بالتحويل المصرفي',
      employeeId: taha.id,
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order2.id,
      amount: 150.0,
      paymentDate: today,
      paymentMethod: 'Cash',
      notes: 'باقي المبلغ نقداً عند الاستلام',
      employeeId: anas.id, // Received by Anas
    },
  });

  // Order 3: Outstanding balance warning (Customer 3, Employee: Anas) - Delivery Tomorrow
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-0003',
      customerId: customers[2].id,
      employeeId: anas.id,
      orderDate: pastWeek,
      status: 'Preparing',
      notes: 'توصيل الطلب لجامعة ناصر',
      subtotal: 600.0,
      discount: 50.0,
      grandTotal: 550.0,
      totalPaid: 100.0,
      remainingBalance: 450.0,
      paymentStatus: 'DepositPaid',
    },
  });

  // Item for Order 3: Long/Butterfly Cap
  await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      category: 'Graduation Cap',
      capType: 'Long / Butterfly Cap',
      quantity: 6,
      unitPrice: 60.0, // 360
      deliveryDate: tomorrow,
      notes: 'فراشة جودة فاخرة',
      status: 'Waiting',
    },
  });

  // Item 2: Brooches
  await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      category: 'Graduation Brooch',
      broochType: 'Name Brooch',
      quantity: 12,
      unitPrice: 20.0, // 240
      deliveryDate: tomorrow,
      notes: 'بروش بالأسماء مذهب',
      status: 'Waiting',
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order3.id,
      amount: 100.0,
      paymentDate: pastWeek,
      paymentMethod: 'Card',
      notes: 'عربون كرت إلكتروني سادات',
      employeeId: anas.id,
    },
  });

  // Order 4: Rented items, returned log (Customer 4, Employee: Taha)
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-0004',
      customerId: customers[3].id,
      employeeId: taha.id,
      orderDate: pastWeek,
      status: 'Completed',
      subtotal: 150.0,
      discount: 0.0,
      grandTotal: 150.0,
      totalPaid: 150.0,
      remainingBalance: 0.0,
      paymentStatus: 'FullyPaid',
    },
  });

  // Sash rental item
  const rentedItem = await prisma.orderItem.create({
    data: {
      orderId: order4.id,
      category: 'Graduation Sash',
      operationType: 'Rental',
      quantity: 3,
      unitPrice: 50.0, // 150 total rental
      depositAmount: 50.0, // 150 total deposit
      deliveryDate: pastWeek,
      returnDate: today,
      notes: 'إيجار وشاح التخرج مع الالتزام بالإرجاع بالموعد',
      status: 'Returned',
    },
  });

  // Payment
  await prisma.payment.create({
    data: {
      orderId: order4.id,
      amount: 150.0,
      paymentDate: pastWeek,
      paymentMethod: 'Cash',
      notes: 'قيمة الإيجار بالكامل مع استلام التأمين نقداً خارج الفاتورة',
      employeeId: taha.id,
    },
  });

  // Create Return Log
  await prisma.returnLog.create({
    data: {
      orderItemId: rentedItem.id,
      quantityReturned: 3,
      returnDate: today,
      condition: 'Excellent',
      notes: 'تم إرجاع جميع الأوشحة بحالة ممتازة واسترداد مبلغ التأمين',
      employeeId: taha.id,
    },
  });

  // 5. Create some Audit Logs
  const auditLogs = [
    { employeeId: anas.id, action: 'CREATE_CUSTOMER', details: 'قام بإنشاء حساب زبون جديد: محمد عبد الله' },
    { employeeId: anas.id, action: 'CREATE_ORDER', details: 'قام بإنشاء الطلب رقم ORD-2026-0001 بقيمة 330 د.ل' },
    { employeeId: anas.id, action: 'ADD_PAYMENT', details: 'استلم دفعة نقدية بقيمة 150 د.ل للطلب ORD-2026-0001' },
    { employeeId: taha.id, action: 'CREATE_CUSTOMER', details: 'قام بإنشاء حساب زبون جديد: أحمد الورفلي' },
    { employeeId: taha.id, action: 'CREATE_ORDER', details: 'قام بإنشاء الطلب رقم ORD-2026-0002 بقيمة 250 د.ل' },
    { employeeId: taha.id, action: 'ADD_PAYMENT', details: 'استلم دفعة بالتحويل بقيمة 100 د.ل للطلب ORD-2026-0002' },
    { employeeId: anas.id, action: 'UPDATE_ORDER', details: 'قام بتحديث حالة الطلب ORD-2026-0001 إلى (جاهز للاستلام)' },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
