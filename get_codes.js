const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  const codes = await prisma.verificationCode.findMany({
    where: { isUsed: false },
    take: 5
  });
  console.log('Unused codes:', codes);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
