import { db } from './firebase';
import { collection, query, getDocs, limit, startAfter, where, orderBy, QueryDocumentSnapshot, DocumentData, doc, setDoc, deleteDoc, writeBatch, getCountFromServer } from 'firebase/firestore';
import { Question, HtmlMockTest } from '../types';

const QUESTIONS_COLLECTION = 'questions';
const HTML_TESTS_COLLECTION = 'htmlmocktests';

export async function getQuestionsPaginated(
  pageSize: number = 20,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  filters?: { subject?: string, difficulty?: string, targetExam?: string }
) {
  let q = query(collection(db, QUESTIONS_COLLECTION), orderBy('id'), limit(pageSize));

  if (filters) {
    if (filters.subject) q = query(q, where('subject', '==', filters.subject));
    if (filters.difficulty) q = query(q, where('difficulty', '==', filters.difficulty));
    if (filters.targetExam) q = query(q, where('targetExam', '==', filters.targetExam));
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const questions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { questions, lastVisible };
}

export async function getAllQuestions() {
  const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
}

export async function getTotalQuestionsCount() {
  const coll = collection(db, QUESTIONS_COLLECTION);
  const snapshot = await getCountFromServer(coll);
  return snapshot.data().count;
}

export async function getHtmlMockTests() {
  const snapshot = await getDocs(collection(db, HTML_TESTS_COLLECTION));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as HtmlMockTest));
}

export async function saveQuestionToFirestore(question: Question) {
  const docRef = doc(db, QUESTIONS_COLLECTION, question.id || Date.now().toString());
  await setDoc(docRef, question);
}

export async function saveHtmlMockTestToFirestore(mockTest: HtmlMockTest) {
  console.log("Saving mock test:", mockTest);
  const docRef = doc(db, HTML_TESTS_COLLECTION, mockTest.id || Date.now().toString());
  try {
    await setDoc(docRef, mockTest);
    console.log("Mock test saved successfully to:", docRef.path);
  } catch (error) {
    console.error("Error saving mock test:", error);
    throw error;
  }
}

export async function deleteQuestionFromFirestore(id: string) {
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
}

export async function batchSaveQuestions(questions: Question[]) {
  const CHUNK_SIZE = 500;
  for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
    const chunk = questions.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(q => {
      const docRef = doc(db, QUESTIONS_COLLECTION, q.id || Date.now().toString());
      batch.set(docRef, q);
    });
    await batch.commit();
  }
}

export async function batchDeleteQuestions(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach(id => {
    batch.delete(doc(db, QUESTIONS_COLLECTION, id));
  });
  await batch.commit();
}
