
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.news.updateMany({
    where: { isPublished: false },
    data: { isPublished: true }
  });
  console.log(`Published ${result.count} news items.`);
  process.exit(0);
}
main();
