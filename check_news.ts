
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.news.count();
  const unpublished = await prisma.news.count({ where: { isPublished: false } });
  console.log(`Total news: ${count}`);
  console.log(`Unpublished news: ${unpublished}`);
  process.exit(0);
}
main();
