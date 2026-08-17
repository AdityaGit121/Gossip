import { db } from '../src/server/firestore.js';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

async function clearCollection(colName: string) {
  try {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleared ${colName}`);
  } catch (err) {
    console.error(`Error clearing ${colName}:`, err);
  }
}

async function run() {
  console.log('Clearing database...');
  await clearCollection('users');
  await clearCollection('chats');
  await clearCollection('messages');
  await clearCollection('moments');
  await clearCollection('media_rooms');
  await clearCollection('password_resets');
  console.log('Database cleared');
}

run();
