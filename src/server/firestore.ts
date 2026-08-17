import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  WhereFilterOp,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let config = {
  projectId: 'gen-lang-client-0922016106',
  appId: '1:923493940489:web:6833c944fc84301873a7d8',
  apiKey: 'AIzaSyATStIIcM4aC5SCifMNF4qriPanVvqCZ18',
  authDomain: 'gen-lang-client-0922016106.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-cipherchat-f9752508-b81c-4f5e-8668-28ba830d3a0f',
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json, using defaults:', err);
}

console.log(`🔥 Initializing Firestore for Project: ${config.projectId}, Database: ${config.firestoreDatabaseId}`);

const app = getApps().length ? getApp() : initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);

export const firestore = {
  collection(colName: string) {
    const colRef = collection(db, colName);
    return {
      doc(docId: string) {
        const dRef = doc(db, colName, docId);
        return {
          async get() {
            const snap = await getDoc(dRef);
            return {
              exists: snap.exists(),
              data: () => snap.data(),
              id: snap.id,
            };
          },
          async set(data: any, options?: any) {
            await setDoc(dRef, data, options);
          },
          async delete() {
            await deleteDoc(dRef);
          },
        };
      },
      async get() {
        const snap = await getDocs(colRef);
        const docs = snap.docs.map((d) => ({
          id: d.id,
          data: () => d.data(),
        }));
        return {
          empty: snap.empty,
          size: snap.size,
          docs,
          forEach(callback: (d: { id: string; data: () => any }) => void) {
            docs.forEach(callback);
          },
        };
      },
      where(field: string, op: WhereFilterOp, val: any) {
        const q = query(colRef, where(field, op, val));
        return {
          async get() {
            const snap = await getDocs(q);
            const docs = snap.docs.map((d) => ({
              id: d.id,
              data: () => d.data(),
            }));
            return {
              empty: snap.empty,
              size: snap.size,
              docs,
              forEach(callback: (d: { id: string; data: () => any }) => void) {
                docs.forEach(callback);
              },
            };
          },
        };
      },
    };
  },
};

