import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AcademicTelemetryLog, ActiveRecallCard, ConceptNode, GraphEdge, SocraticTurn } from '../types';

interface MetaCognitionDB extends DBSchema {
  telemetry: {
    key: string;
    value: AcademicTelemetryLog;
  };
  recallCards: {
    key: string;
    value: ActiveRecallCard;
  };
  graphState: {
    key: string;
    value: { id: string; nodes: ConceptNode[]; edges: GraphEdge[] };
  };
  socraticHistory: {
    key: string;
    value: SocraticTurn;
  };
}

const DB_NAME = 'metacognition-ai';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MetaCognitionDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<MetaCognitionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('telemetry')) {
          db.createObjectStore('telemetry', { keyPath: 'sessionDate' });
        }
        if (!db.objectStoreNames.contains('recallCards')) {
          db.createObjectStore('recallCards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('graphState')) {
          db.createObjectStore('graphState', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('socraticHistory')) {
          db.createObjectStore('socraticHistory', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTelemetryLog(log: AcademicTelemetryLog) {
  const db = await getDb();
  await db.put('telemetry', log);
}

export async function getAllTelemetryLogs(): Promise<AcademicTelemetryLog[]> {
  const db = await getDb();
  return (await db.getAll('telemetry')).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

export async function saveRecallCard(card: ActiveRecallCard) {
  const db = await getDb();
  await db.put('recallCards', card);
}

export async function saveRecallCards(cards: ActiveRecallCard[]) {
  const db = await getDb();
  const tx = db.transaction('recallCards', 'readwrite');
  await Promise.all(cards.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function getAllRecallCards(): Promise<ActiveRecallCard[]> {
  const db = await getDb();
  return db.getAll('recallCards');
}

export async function saveGraphState(id: string, nodes: ConceptNode[], edges: GraphEdge[]) {
  const db = await getDb();
  await db.put('graphState', { id, nodes, edges });
}

export async function getGraphState(id: string) {
  const db = await getDb();
  return db.get('graphState', id);
}

export async function appendSocraticTurn(turn: SocraticTurn) {
  const db = await getDb();
  await db.put('socraticHistory', turn);
}

export async function getAllSocraticHistory(): Promise<SocraticTurn[]> {
  const db = await getDb();
  return (await db.getAll('socraticHistory')).sort((a, b) => a.timestamp - b.timestamp);
}
