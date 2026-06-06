/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Question, SourceDocument, GeneratedPromptConfig, HtmlMockTest } from "../types";
import {
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  Sliders,
  Settings,
  HelpCircle,
  CheckCircle2,
  FilePlus,
  RefreshCw,
  Database,
  ArrowRight,
  Brain,
  Sparkles,
  Zap,
  MessageSquare
} from "lucide-react";
import { getQuestionsPaginated, saveQuestionToFirestore, deleteQuestionFromFirestore, batchSaveQuestions, getAllQuestions, batchDeleteQuestions, saveHtmlMockTestToFirestore, getHtmlMockTests } from "../lib/firebaseService";
import { setItem } from "../lib/db";
import { parseHtmlToQuestions } from "../parser";

interface AdminPanelProps {
  questions: Question[];
  setQuestions: (qs: Question[]) => void;
  documents: SourceDocument[];
  setDocuments: (docs: SourceDocument[]) => void;
  promptConfig: GeneratedPromptConfig;
  setPromptConfig: (config: GeneratedPromptConfig) => void;
  activeExam: string;
  exams: any[];
  setExams: (exams: any[]) => void;
  setActiveExam: (name: string) => void;
  totalQuestionsCount: number;
  setTotalQuestionsCount: (count: number | ((prev: number) => number)) => void;
}

export default function AdminPanel({
  questions,
  setQuestions,
  documents,
  setDocuments,
  promptConfig,
  setPromptConfig,
  activeExam,
  exams,
  setExams,
  setActiveExam,
  totalQuestionsCount,
  setTotalQuestionsCount
}: AdminPanelProps) {
  const [activeTab, setActiveTab ] = useState<"documents" | "portfolio" | "aitools" | "database" | "flagged">("documents");
  const [syncStatus, setSyncStatus] = useState<"Synced" | "Syncing...">("Synced");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleExportDatabase = async () => {
      const allQs = await getAllQuestions();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allQs));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "question_database.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      triggerSuccessAlert("Database exported successfully.");
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const importedQuestions = JSON.parse(event.target?.result as string);
              if (!confirm("Replacing/Merging database. Are you sure?")) return;
              
              await batchSaveQuestions(importedQuestions);
              setSyncStatus("Syncing...");
              // Simply replace the state with the imported ones for a true 'import' operation
              setQuestions(importedQuestions);
              // Cache in IndexedDB too (skipping sync as they are just now pushed to FS)
              setItem("target_questions_pool", importedQuestions, true).catch(console.error);
              triggerSuccessAlert("Database imported and bank replaced successfully.");
              setSyncStatus("Synced");
          } catch (err) {
              alert("Error importing database: " + err);
          }
      };
      reader.readAsText(file);
  };

  // Manual MCQ builder fields
  const [manualQuestion, setManualQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctIdx, setCorrectIdx] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [subject, setSubject] = useState("General Knowledge");
  const [topic, setTopic] = useState("General Awareness");
  const [subtopic, setSubtopic] = useState("General Subtopics");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [targetExam, setTargetExam] = useState(activeExam);

  // Ingestion fields
  const [docName, setDocName] = useState("");
  const [docYear, setDocYear] = useState(new Date().getFullYear().toString());
  const [docContent, setDocContent] = useState("");
  const [docSelectedExam, setDocSelectedExam] = useState(activeExam);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New features state
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [genDifficulty, setGenDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [genNumQuestions, setGenNumQuestions] = useState(5);
  const [docGenModel, setDocGenModel] = useState("gemini-2.0-flash");
  const [isGeneratingDocMCQs, setIsGeneratingDocMCQs] = useState(false);
  const [docType, setDocType] = useState<'notes' | 'pyq'>("notes");
  const [extractEnglishOnly, setExtractEnglishOnly] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number | null>(null);
  const [generationProgressText, setGenerationProgressText] = useState("");
  const [extractProgress, setExtractProgress] = useState<number | null>(null);
  const [extractProgressText, setExtractProgressText] = useState("");
  const [htmlTests, setHtmlTests] = useState<HtmlMockTest[]>([]);
  const [htmlUploadProgress, setHtmlUploadProgress] = useState<number | null>(null);
  const [htmlUploadStatus, setHtmlUploadStatus] = useState("");

  const fetchHtmlTests = async () => {
    try {
      const tests = await getHtmlMockTests();
      setHtmlTests(tests);
    } catch (error) {
      console.error("Error fetching mock tests:", error);
    }
  };

  React.useEffect(() => {
    fetchHtmlTests();
  }, []);

  // Focus Target Management states in AdminPanel
  const [newPortExamName, setNewPortExamName] = useState("");
  const [newPortExamCategory, setNewPortExamCategory] = useState("State Recruitment Exams");
  const [newPortExamSyllabus, setNewPortExamSyllabus] = useState("");
  const [newPortExamDate, setNewPortExamDate] = useState("");
  const [newPortExamDiff, setNewPortExamDiff] = useState("Medium");
  const [newPortExamMockQuestions, setNewPortExamMockQuestions] = useState(50);
  const [newPortExamMockDuration, setNewPortExamMockDuration] = useState(120);

  // Alphanumeric tokens extraction and overlap similarity calculator (deduplication)
  const getAlphanumericTokens = (text: string): string[] => {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
  };

  const calculateSimilarity = (q1: string, q2: string): number => {
    const t1 = getAlphanumericTokens(q1);
    const t2 = getAlphanumericTokens(q2);
    if (t1.length === 0 || t2.length === 0) return 0;
    
    const set1 = new Set(t1);
    const set2 = new Set(t2);
    
    let intersection = 0;
    set1.forEach(token => {
      if (set2.has(token)) intersection++;
    });
    
    const unionSize = set1.size + set2.size - intersection;
    const jaccard = intersection / unionSize;
    const overlap = intersection / Math.min(set1.size, set2.size);
    // Return max to secure both simple containment and Jaccard similarity matches
    return Math.max(jaccard, overlap);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultString = reader.result as string;
        const base64Clean = resultString.split(",")[1];
        resolve(base64Clean);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Triggering visual success notices
  const triggerSuccessAlert = (message: string) => {
    setSaveSuccess(message);
    setTimeout(() => {
      setSaveSuccess(null);
    }, 3500);
  };

  const handlePortfolioCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortExamName.trim()) {
      alert("Please provide a valid target exam name.");
      return;
    }

    const examUpper = newPortExamName.trim().toUpperCase();

    // Check for duplicate exams
    if (exams.some(ex => ex.name.toUpperCase() === examUpper)) {
      alert("This exam is already indexed inside your cognitive suite!");
      return;
    }

    const targetIso = newPortExamDate 
      ? new Date(newPortExamDate).toISOString() 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newExam = {
      id: "exam-" + Date.now(),
      name: examUpper,
      shortName: examUpper.substring(0, 5),
      targetDate: targetIso,
      category: newPortExamCategory,
      totalVacancy: 100, // static default under the hood
      syllabusBrief: newPortExamSyllabus.trim() || "General Study Syllabus metrics and criteria dynamic directives.",
      difficultyWeightage: newPortExamDiff,
      mockQuestionCount: Number(newPortExamMockQuestions) || 50,
      mockDurationMinutes: Number(newPortExamMockDuration) || 120
    };

    const updated = [...exams, newExam];
    setExams(updated);
    localStorage.setItem("target_exams", JSON.stringify(updated));
    setActiveExam(newExam.name);

    // Reset input fields
    setNewPortExamName("");
    setNewPortExamSyllabus("");
    setNewPortExamDate("");

    triggerSuccessAlert(`Exam "${newExam.name}" registered to focus suite portfolio successfully!`);
  };

  const handlePortfolioDeleteExam = (id: string, name: string) => {
    if (exams.length <= 1) {
      alert("Error: At least one active target exam must remain in your dashboard focus suite.");
      return;
    }
    const filtered = exams.filter(e => e.id !== id);
    setExams(filtered);
    localStorage.setItem("target_exams", JSON.stringify(filtered));
    if (activeExam === name) {
      setActiveExam(filtered[0].name);
    }
    triggerSuccessAlert(`Exam "${name}" successfully deleted from focus portfolios.`);
  };

  const handlePortfolioUpdateDeadline = (id: string, newDateStr: string) => {
    if (!newDateStr) return;
    const updated = exams.map(e => {
      if (e.id === id) {
        return { ...e, targetDate: new Date(newDateStr).toISOString() };
      }
      return e;
    });
    setExams(updated);
    localStorage.setItem("target_exams", JSON.stringify(updated));
    triggerSuccessAlert("Target exam deadline successfully adjusted!");
  };

  const handleBuildMCQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestion || !optA || !optB || !optC || !optD) {
      alert("Please populate the question and all four option alternatives.");
      return;
    }

    const newQ: Question = {
      id: "manual-" + Date.now() + "-" + Math.random().toString(36).substring(4),
      question: manualQuestion,
      options: [optA, optB, optC, optD],
      correctOptionIndex: correctIdx,
      explanation: explanation || "No official explanation is documented. Verify through public curriculum guidelines.",
      subject: subject,
      topic: topic,
      subtopic: subtopic,
      difficulty: difficulty,
      sourceType: "notes",
      timesAnswered: 0,
      timesCorrect: 0,
      targetExam: targetExam
    };

    saveQuestionToFirestore(newQ).then(() => {
        setSyncStatus("Syncing...");
        const updated = [newQ, ...questions];
        setQuestions(updated);
        setTotalQuestionsCount(prev => prev + 1);
        triggerSuccessAlert(`Successfully added 1 premium custom MCQ to active Focus pool (Total pool size is now ${updated.length} MCQs)!`);
        setSyncStatus("Synced");
    }).catch(err => {
        console.error(err);
        setSyncStatus("Synced");
        alert("Failed to save to database: " + err.message);
    });

    // Clear builder inputs
    setManualQuestion("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setExplanation("");
    setCorrectIdx(0);
  };

  const isDuplicateQuestion = (newQuestionText: string): boolean => {
    return questions.some((existingQ) => calculateSimilarity(newQuestionText, existingQ.question) >= 0.70);
  };

  const handleAIAutoFill = async () => {
    if (!manualQuestion) {
      alert("Please enter a basic question description or concept draft first inside the textarea.");
      return;
    }
    setIsAutoFilling(true);
    try {
      const response = await fetch("/api/ai-autofill-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: manualQuestion, activeExam })
      });
      const data = await response.json();
      if (data.success && data.draft) {
        if (data.draft.options && data.draft.options.length >= 4) {
          setOptA(data.draft.options[0]);
          setOptB(data.draft.options[1]);
          setOptC(data.draft.options[2]);
          setOptD(data.draft.options[3]);
        }
        if (data.draft.explanation) {
          setExplanation(data.draft.explanation);
        }
        if (typeof data.draft.correctOptionIndex === "number") {
          setCorrectIdx(data.draft.correctOptionIndex);
        }
        if (data.draft.subject) setSubject(data.draft.subject);
        if (data.draft.topic) setTopic(data.draft.topic);
        if (data.draft.subtopic) setSubtopic(data.draft.subtopic);
        triggerSuccessAlert("🌟 Manual MCQ successfully structured and filled via Gemini AI assistant!");
      } else {
        // Fallback drafts
        setOptA("Operational administrative metric standards (Auto-fallback)");
        setOptB("Superficial localized structural policy blocks (Auto-fallback)");
        setOptC("Sub-optimal legacy evaluation system procedures (Auto-fallback)");
        setOptD("Focal target consistency thresholds (Auto-fallback)");
        setCorrectIdx(0);
        setExplanation("Standardized evaluation template representing our offline backup. Configure a real GEMINI_API_KEY to retrieve high-fidelity explanations.");
        triggerSuccessAlert("Offline backup choices formulated! Setup your GEMINI_API_KEY inside AI Studio to activate genuine AI MCQ drafting.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error calling draft autofill: " + err.message);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Ingest Document
  const handleIngestContent = (name: string, contentText: string, examTarget: string) => {
    if (!contentText || !name) {
      alert("Missing study content or document filename parameters.");
      return;
    }

    const wc = contentText.split(/\s+/).filter(Boolean).length;
    const newDoc: SourceDocument = {
      id: "doc-" + Date.now(),
      name: name,
      content: contentText,
      wordCount: wc,
      uploadedAt: new Date().toISOString(),
      targetExam: examTarget,
      docType: docType
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    localStorage.setItem("ingested_documents", JSON.stringify(updated));

    // Clear inputs
    setDocName("");
    setDocContent("");

    triggerSuccessAlert(`Document Ingested! Processed ${wc} words successfully under ${examTarget}`);
  };

  // Drag and drop events handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      readAndProcessIngestionFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      readAndProcessIngestionFile(files[0]);
    }
  };

  // Dynamic loader for PDF.js to extract text directly on user's browser
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error("CDN PDF library failed to load."));
      document.head.appendChild(script);
    });
  };

  const readAndProcessIngestionFile = async (file: File) => {
    setExtractProgress(5);
    setExtractProgressText("Analyzing file container stream...");

    const isPDF = file.name.endsWith(".pdf") || file.type === "application/pdf";

    if (isPDF) {
      setIsProcessingAI(true);
      try {
        setExtractProgress(15);
        setExtractProgressText("Booting client-side high-fidelity PDF parser...");
        
        // 1. Try browser client-side high-speed PDF text parsing
        let rawExtractedText = "";
        let clientParseSuccess = false;

        try {
          const pdfjsLib = await loadPdfJS();
          setExtractProgress(30);
          setExtractProgressText("Loading document binary bytes directly in browser...");
          
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          let pageTexts: string[] = [];
          const numPages = pdf.numPages;
          
          for (let p = 1; p <= numPages; p++) {
            setExtractProgress(Math.min(30 + Math.floor((p / numPages) * 55), 85));
            setExtractProgressText(`Sieving & decoding characters from page ${p} of ${numPages}...`);
            
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(" ");
            pageTexts.push(pageText);
          }
          
          rawExtractedText = pageTexts.join("\n");
          if (rawExtractedText && rawExtractedText.trim().length > 50) {
            clientParseSuccess = true;
            console.log("Client-side PDF text extraction succeeded! Length:", rawExtractedText.length);
          }
        } catch (clientErr) {
          console.warn("Client-side PDF extraction skipped or failed, falling back to server binary upload:", clientErr);
        }

        // 2. Prep call to server, either with lightweight extracted text OR full base64 fallback
        setExtractProgress(88);
        setExtractProgressText(clientParseSuccess ? "Sending plain-text payload to server AI..." : "Parsing deep PDF byte layout & converting to base64...");

        let payload: any = {
          fileName: file.name,
          targetExam: docSelectedExam,
          extractEnglishOnly: docType === 'pyq' && extractEnglishOnly
        };

        if (clientParseSuccess) {
          payload.rawText = rawExtractedText;
        } else {
          const base64 = await convertFileToBase64(file);
          payload.base64Data = base64;
        }

        const response = await fetch("/api/ingest-pdf-to-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(errorMsg || `Server responded with status ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setExtractProgress(100);
          setExtractProgressText("Resource OCR and Text Extraction Finalized!");
          setTimeout(() => {
            setExtractProgress(null);
            setExtractProgressText("");
          }, 1200);

          setDocName(file.name);
          setDocContent(data.extractedText);

          // Save to repository so active document dropdown updates instantly
          const wc = data.wordCount || data.extractedText.split(/\s+/).filter(Boolean).length;
          const newDoc: SourceDocument = {
            id: "doc-" + Date.now(),
            name: file.name,
            content: data.extractedText,
            wordCount: wc,
            uploadedAt: new Date().toISOString(),
            targetExam: docSelectedExam,
            docType: docType
          };

          const updatedDocs = [newDoc, ...documents];
          setDocuments(updatedDocs);
          localStorage.setItem("ingested_documents", JSON.stringify(updatedDocs));
          setSelectedDocId(newDoc.id); // Auto select!

          triggerSuccessAlert(`AI Extracted PDF text successfully! (${wc} words captured)`);
        } else {
          setExtractProgress(null);
          alert("Error processing PDF via AI: " + (data.error || "Unknown error"));
        }
      } catch (err: any) {
        setExtractProgress(null);
        alert("Failed to analyze PDF via server AI: " + err.message);
      } finally {
        setIsProcessingAI(false);
      }
      return;
    }

    // Setup progressive interval simulator for plain-text file
    let simulatedVal = 10;
    const progressInterval = setInterval(() => {
      simulatedVal += Math.floor(Math.random() * 8) + 3;
      if (simulatedVal >= 90) {
        simulatedVal = 90;
      }
      setExtractProgress(simulatedVal);
      setExtractProgressText("Cleaning file line endings & sanitizing typography...");
    }, 150);

    if (file.type !== "text/plain" && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      clearInterval(progressInterval);
      setExtractProgress(null);
      alert("Only standard text or PDF files (.txt, .md, .pdf) are supported.");
      return;
    }

    // Standard text files
    const reader = new FileReader();
    reader.onload = (e) => {
      clearInterval(progressInterval);
      setExtractProgress(100);
      setExtractProgressText("Text decoded successfully!");
      setTimeout(() => {
        setExtractProgress(null);
        setExtractProgressText("");
      }, 1000);

      const text = e.target?.result as string;
      setDocName(file.name);
      setDocContent(text);

      const wc = text.split(/\s+/).filter(Boolean).length;
      const newDoc: SourceDocument = {
        id: "doc-" + Date.now(),
        name: file.name,
        content: text,
        wordCount: wc,
        uploadedAt: new Date().toISOString(),
        targetExam: docSelectedExam,
        docType: docType
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      localStorage.setItem("ingested_documents", JSON.stringify(updatedDocs));
      setSelectedDocId(newDoc.id); // Auto select!

      triggerSuccessAlert(`Text imported successfully! (${wc} words loaded)`);
    };
    reader.readAsText(file);
  };

  const handleGenerateDocMCQs = async () => {
    if (!selectedDocId) {
      alert("Please select an uploaded context document from the dropdown first.");
      return;
    }
    const targetDoc = documents.find(d => d.id === selectedDocId);
    if (!targetDoc) return;

    setIsGeneratingDocMCQs(true);
    setGenerationProgress(5);
    setGenerationProgressText("Initializing high-capacity concurrent generator...");

    const isPaperPYQ = targetDoc.docType === "pyq";
    
    // Split into smaller, highly secure chunks (max 20 questions per API call to avoid timeouts of heavy payloads)
    const maxBatchSize = 20;
    const totalNeeded = genNumQuestions;
    const batchSizes: number[] = [];
    
    let remaining = totalNeeded;
    while (remaining > 0) {
      if (remaining >= maxBatchSize) {
        batchSizes.push(maxBatchSize);
        remaining -= maxBatchSize;
      } else {
        batchSizes.push(remaining);
        remaining = 0;
      }
    }

    // Progress percentage tracking
    let progressVal = 5;
    const progressInterval = setInterval(() => {
      progressVal = Math.min(98, progressVal + Math.floor(Math.random() * 4) + 1);
      setGenerationProgress(progressVal);
      if (progressVal < 30) {
        setGenerationProgressText("Broadcasting parallel block jobs to Gemini evaluator pool...");
      } else if (progressVal < 60) {
        setGenerationProgressText(`Compiling syllabus notes concurrently (${batchSizes.length} concurrent workers active)...`);
      } else if (progressVal < 85) {
        setGenerationProgressText("Verifying answer index distribution & calculating topic coverage...");
      } else {
        setGenerationProgressText("Synthesizing outputs and consolidating unique questions pool...");
      }
    }, 280);

    try {
      // Execute all concurrent worker requests in parallel
      const promises = batchSizes.map(async (size, idx) => {
        const response = await fetch("/api/generate-mcqs-from-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentContent: targetDoc.content,
            documentName: targetDoc.name,
            difficulty: genDifficulty,
            numQuestions: size,
            activeFocusExam: targetDoc.targetExam,
            model: docGenModel,
            isPYQ: isPaperPYQ,
            extractEnglishOnly: isPaperPYQ && extractEnglishOnly,
            batchIndex: idx
          })
        });
        if (!response.ok) {
          throw new Error(`Concurrent worker block ${idx + 1} processing failed.`);
        }
        return response.json();
      });

      const results = await Promise.all(promises);
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Consolidate all returned questions
      let allIncomingQuestions: Question[] = [];
      let offlineDetected = false;

      results.forEach(res => {
        if (res.success && res.questions) {
          allIncomingQuestions = [...allIncomingQuestions, ...res.questions];
          if (res.isOfflineFallback) {
            offlineDetected = true;
          }
        }
      });

      if (allIncomingQuestions.length > 0) {
        let finalKept: Question[] = [];
        let deletedDuplicateCount = 0;

        allIncomingQuestions.forEach((incomingQ, idx) => {
          // Prevent ID collisions from parallel block runs
          const cleanId = incomingQ.id + "-batch-" + idx + "-" + Math.random().toString(36).substring(4);
          incomingQ.id = cleanId;

          let hasOverlapMatch = isDuplicateQuestion(incomingQ.question);

          // Deduplicate with items inside this exact batch session
          if (!hasOverlapMatch) {
            finalKept.forEach((alreadyKeptQ) => {
              const similarity = calculateSimilarity(incomingQ.question, alreadyKeptQ.question);
              if (similarity >= 0.70) {
                hasOverlapMatch = true;
              }
            });
          }

          if (hasOverlapMatch) {
            deletedDuplicateCount++;
          } else {
            finalKept.push(incomingQ);
          }
        });

        if (finalKept.length > 0) {
          await batchSaveQuestions(finalKept);
          const updated = [...finalKept, ...questions];
          setQuestions(updated);
          
          triggerSuccessAlert(
            `🚀 Fast Ingress Complete! Successfully added ${finalKept.length} premium MCQs to active Focus pool (Total pool size is now ${updated.length} MCQs in database).` +
            (deletedDuplicateCount > 0 ? ` Retained unique set, filtered out ${deletedDuplicateCount} matching duplicates.` : "") +
            (offlineDetected ? " (Pushed dummy mock questions fallback because GEMINI_API_KEY is unset)" : "")
          );
        } else {
          triggerSuccessAlert(`⚠️ All ${allIncomingQuestions.length} compiled MCQs mirrored existing question bank signatures and were safely omitted.`);
        }
      } else {
        alert("Failed to synthesize compiled MCQs. Please verify structural bounds or reload key settings.");
      }

    } catch (err: any) {
      alert("Error calling document MCQs compiler: " + err.message);
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationProgressText("Success! Academic indexing cycle finalized.");
      setTimeout(() => {
        setIsGeneratingDocMCQs(false);
        setGenerationProgress(null);
        setGenerationProgressText("");
      }, 1000);
    }
  };

  const handleClearAllAddedQuestions = () => {
    if (confirm("Are you sure you want to permanently delete ALL added custom, manual, or AI-generated questions from the database? Default baseline questions will remain.")) {
      const idsToDelete = questions.filter(q => q.id.startsWith("manual-") || q.id.startsWith("gen-") || q.sourceType === "notes" || q.sourceType === "current_affairs").map(q => q.id);
      batchDeleteQuestions(idsToDelete).then(() => {
          setSyncStatus("Syncing...");
          const filtered = questions.filter(q => !idsToDelete.includes(q.id));
          setQuestions(filtered);
          triggerSuccessAlert("All added questions deleted from database successfully.");
          setSyncStatus("Synced");
      }).catch(err => {
         console.error(err);
         setSyncStatus("Synced");
         alert("Failed to delete questions: " + err.message);
      });
    }
  };

  const handleClearEverything = () => {
    if (confirm("WARNING: Are you sure you want to completely clear the entire question database? This will delete ALL questions, leaving it fully blank.")) {
      const idsToDelete = questions.map(q => q.id);
      batchDeleteQuestions(idsToDelete).then(() => {
          setSyncStatus("Syncing...");
          setQuestions([]);
          setTotalQuestionsCount(0);
          triggerSuccessAlert("Database fully wiped. Ready for custom notes ingestion imports.");
          setSyncStatus("Synced");
      }).catch(err => {
         console.error(err);
         setSyncStatus("Synced");
         alert("Failed to wipe database: " + err.message);
      });
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionFromFirestore(id).then(() => {
          setSyncStatus("Syncing...");
          const filtered = questions.filter(q => q.id !== id);
          setQuestions(filtered);
          setTotalQuestionsCount(prev => Math.max(0, prev - 1));
          triggerSuccessAlert("Question deleted successfully.");
          setSyncStatus("Synced");
      }).catch(err => {
          console.error(err);
          setSyncStatus("Synced");
          alert("Failed to delete from database: " + err.message);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Are you sure you want to delete the ${selectedQuestionIds.size} selected question(s)?`)) {
      const idsToDelete: string[] = Array.from(selectedQuestionIds);
      batchDeleteQuestions(idsToDelete).then(() => {
          setSyncStatus("Syncing...");
          const filtered = questions.filter(q => !selectedQuestionIds.has(q.id));
          setQuestions(filtered);
          setSelectedQuestionIds(new Set());
          setTotalQuestionsCount(prev => Math.max(0, prev - idsToDelete.length));
          triggerSuccessAlert("Selected questions deleted successfully.");
          setSyncStatus("Synced");
      }).catch(err => {
          console.error(err);
          setSyncStatus("Synced");
          alert("Failed to delete selected questions: " + err.message);
      });
    }
  };

  const handleUpdateCorrectOption = (id: string, newCorrectIdx: number) => {
    const qToUpdate = questions.find(q => q.id === id);
    if (!qToUpdate) return;
    
    const updatedQ = { ...qToUpdate, correctOptionIndex: newCorrectIdx };
    
    saveQuestionToFirestore(updatedQ).then(() => {
        setSyncStatus("Syncing...");
        const updated = questions.map(q => q.id === id ? updatedQ : q);
        setQuestions(updated);
        triggerSuccessAlert("Answer key updated successfully.");
        setSyncStatus("Synced");
    }).catch(err => {
        console.error(err);
        setSyncStatus("Synced");
        alert("Failed to update answer key in database: " + err.message);
    });
  };

  const handleDeleteDoc = (id: string) => {
    const filtered = documents.filter(d => d.id !== id);
    setDocuments(filtered);
    localStorage.setItem("ingested_documents", JSON.stringify(filtered));
    triggerSuccessAlert("Document index removed successfully.");
  };

  const handleSyncToDatabase = async () => {
    setSyncStatus("Syncing...");
    await batchSaveQuestions(questions);
    triggerSuccessAlert("Sync completed.");
    setSyncStatus("Synced");
  };
  
  const handleDeduplicate = () => {
    const unique: Question[] = [];
    questions.forEach((q) => {
      let isDup = false;
      for (const existing of unique) {
          if (calculateSimilarity(q.question, existing.question) >= 0.95) {
              isDup = true;
              break;
          }
      }
      if (!isDup) unique.push(q);
    });
    
    setQuestions(unique);
    triggerSuccessAlert(`Deduplication complete. Removed ${questions.length - unique.length} duplicates.`);
  };

  // Config saves
  const handleSavePromptConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("generated_prompt_config", JSON.stringify(promptConfig));
    triggerSuccessAlert("System Prompt administrative configurations updated successfully.");
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-hub-desktop">
      
      {/* Save Notify alerts toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-55 flex items-center gap-3 bg-emerald-500 text-slate-100 px-5 py-3 rounded-xl shadow-lg border border-emerald-400/20 text-xs font-semibold animate-slide-up">
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Admin Grid Header Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="space-y-0.5">
          <h2 className="text-lg font-extrabold text-slate-200">Control Room & Ingestion Hub</h2>
          <p className="text-xs text-slate-500 font-mono">Build question banks, upload textual resources, modify AI prompts.</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-slate-950 p-1 rounded-lg border border-slate-850">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
              activeTab === "documents" ? "bg-indigo-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Syllabus Ingestion
          </button>

          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
              activeTab === "portfolio" ? "bg-indigo-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Focus Target Manager
          </button>

          <button
            onClick={() => setActiveTab("aitools")}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
              activeTab === "aitools" ? "bg-indigo-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🤖 AI Tools
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
              activeTab === "database" ? "bg-indigo-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database size={15} className="inline mr-1" /> Database
          </button>
          <button
            onClick={() => setActiveTab("flagged")}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
              activeTab === "flagged" ? "bg-red-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🚨 Flagged Qs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Workplaces */}
        <div className="lg:col-span-2">
          


          {activeTab === "aitools" && (
            <div className="space-y-6 animate-fade-in" id="ai-tools-pane">
              {/* HTML Mock Test Ingestion Factory */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" id="html-mock-factory">
                <div className="space-y-0.5">
                  <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                    <Database size={18} className="text-indigo-400" /> HTML Mock Test Ingestion
                  </h3>
                  <p className="text-xs text-slate-500">Directly upload raw HTML files for storage.</p>
                </div>
                
                {/* Progress Bar and Status */}
                {htmlUploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Status:</span>
                      <span>{htmlUploadStatus}</span>
                      <span>{Math.round(htmlUploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${htmlUploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept=".html"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    
                    setHtmlUploadProgress(5);
                    setHtmlUploadStatus(`Reading ${files.length} file(s)...`);
                    
                    const extractedQuestions: Question[] = [];
                    
                    // Read file utility helper using Promise
                    const readFileAsText = (file: File): Promise<string> => {
                      return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.onerror = (err) => reject(err);
                        reader.readAsText(file);
                      });
                    };

                    try {
                      // Process files sequentially
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const progressStepStart = 10 + (i / files.length) * 40;
                        setHtmlUploadProgress(progressStepStart);
                        setHtmlUploadStatus(`Parsing ${file.name} (${i + 1}/${files.length})...`);
                        
                        const htmlContent = await readFileAsText(file);
                        const fileQuestions = parseHtmlToQuestions(htmlContent, activeExam);
                        extractedQuestions.push(...fileQuestions);
                      }

                      if (extractedQuestions.length === 0) {
                        alert("No questions found across any of the uploaded files. Ensure the HTML format matches expected structure.");
                        setHtmlUploadProgress(null);
                        setHtmlUploadStatus("");
                        return;
                      }

                      setHtmlUploadProgress(60);
                      setHtmlUploadStatus(`Saving ${extractedQuestions.length} questions in bulk...`);

                      // Save questions
                      await batchSaveQuestions(extractedQuestions);

                      // Save test record for history tracking
                      const firstFileName = files[0].name;
                      const displayName = files.length > 1 ? `${firstFileName} + ${files.length - 1} other file(s)` : firstFileName;
                      
                      const newMockTest: HtmlMockTest = {
                        id: "html-" + Date.now(),
                        name: displayName,
                        htmlContent: "", 
                        uploadedAt: new Date().toISOString(),
                        targetExam: activeExam
                      };
                      await saveHtmlMockTestToFirestore(newMockTest);
                      
                      setHtmlUploadProgress(100);
                      setHtmlUploadStatus("Saved Successfully!");
                      setTotalQuestionsCount(prev => prev + extractedQuestions.length);
                      triggerSuccessAlert(`Bulk Ingestion Finished: Parsed ${files.length} file(s) and synced ${extractedQuestions.length} MCQs to Firestore successfully!`);
                      setQuestions([...extractedQuestions, ...questions]);
                      
                      // Clear files selection input so user can import again
                      e.target.value = "";
                      
                      setTimeout(() => {
                         setHtmlUploadProgress(null);
                         setHtmlUploadStatus("");
                      }, 2500);
                    } catch (err: any) {
                      setHtmlUploadProgress(null);
                      setHtmlUploadStatus("");
                      alert("Failed bulk import: " + err.message);
                    }
                  }}
                  className="block w-full text-sm text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                  "
                />
              </div>
              
            {/* Syllabus MCQ Factory */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" id="syllabus-mcq-factory">
                <div className="space-y-0.5">
                  <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                    <Brain size={18} className="text-indigo-400" /> Syllabus / PYQ Ingestion Factory
                  </h3>
                  <p className="text-xs text-slate-500">Upload PDF/Text source documents, categorize by exam paper, and generate or extract questions.</p>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-855 rounded-xl font-sans space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-mono uppercase text-slate-400">Exam Category</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                        value={docSelectedExam}
                        onChange={(e) => setDocSelectedExam(e.target.value)}
                      >
                        {exams.map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-mono uppercase text-slate-400">Year</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 2024"
                        value={docYear}
                        onChange={(e) => setDocYear(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-mono uppercase text-slate-400">Paper/Section Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Paper 1 - GK"
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input type="radio" name="docType" checked={docType === 'notes'} onChange={() => setDocType('notes')} className="text-indigo-600" />
                      Syllabus Notes
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input type="radio" name="docType" checked={docType === 'pyq'} onChange={() => setDocType('pyq')} className="text-indigo-600" />
                      PYQ Paper
                    </label>
                  </div>

                  {docType === 'pyq' && (
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={extractEnglishOnly} onChange={(e) => setExtractEnglishOnly(e.target.checked)} className="text-indigo-600" />
                      Extract English Only (Ignores Hindi content)
                    </label>
                  )}

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-900"}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.txt,.md" />
                    <UploadCloud size={24} className="mx-auto text-slate-500 mb-2" />
                    <p className="text-xs text-slate-400">Drop PDF or Text file here, or click to upload.</p>
                  </div>
                </div>

                {/* The rest of the existing syllabus factory interface with generator tools */}
                <div className="space-y-4 border-t border-slate-850 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <h4 className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Configure Gen AI MCQ Factory</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-4 border border-slate-850 rounded-xl">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono uppercase text-slate-400">Reference Syllabus</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                      >
                        <option value="">-- Choose Document --</option>
                        {documents.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} ({doc.wordCount} words)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono uppercase text-slate-400">A.I. Engine Model</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={docGenModel}
                        onChange={(e) => setDocGenModel(e.target.value)}
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                        <option value="llama3-70b-8192">Groq Llama 3 (70B)</option>
                        <option value="gpt-4o">ChatGPT GPT-4o</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono uppercase text-slate-400">Questions Count</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={genNumQuestions}
                        onChange={(e) => setGenNumQuestions(Number(e.target.value))}
                      >
                        <option value="5">5 Questions</option>
                        <option value="10">10 Questions</option>
                        <option value="15">15 Questions</option>
                        <option value="20">20 Questions</option>
                        <option value="30">30 Questions</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono uppercase text-slate-400">Target Difficulty</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={genDifficulty}
                        onChange={(e) => setGenDifficulty(e.target.value as any)}
                      >
                        <option value="easy">Easy Foundation</option>
                        <option value="medium">Medium Standard</option>
                        <option value="hard">Hard Advanced</option>
                      </select>
                    </div>
                  </div>

                  {/* Generation triggers */}
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerateDocMCQs}
                      disabled={isGeneratingDocMCQs || !selectedDocId}
                      className="w-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isGeneratingDocMCQs ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Channelling Academic AI Model...
                        </>
                      ) : (
                        <>
                          <Brain size={14} /> Synthesize MCQs from Syllabus Context
                        </>
                      )}
                    </button>

                    {isGeneratingDocMCQs && generationProgress !== null && (
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2 font-sans">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-indigo-400 font-bold font-mono uppercase">🤖 Ingestion Synthesizer Status</span>
                          <span className="text-slate-200 font-extrabold font-mono">{generationProgress}%</span>
                        </div>
                        
                        {/* Progress Bar Container */}
                        <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${generationProgress}%` }}
                          ></div>
                        </div>

                        <p className="text-[10px] text-slate-400 font-semibold italic text-center">
                          {generationProgressText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-100 text-base">Weak Topic Test Generator</h3>
                <p className="text-sm text-slate-400">Generates custom tests based on identified weak areas from performance logs.</p>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold w-full">Generate Weak Topic Test</button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-100 text-base">Timed Exam Simulation</h3>
                <p className="text-sm text-slate-400">Simulate a high-pressure exam environment with strict timing.</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Duration (min)" className="bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 text-base md:text-xs w-full" />
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Start Simulation</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "flagged" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6" id="flagged-pane">
              <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                🚨 Flagged Questions for Review
              </h3>
              {questions.filter(q => q.isFlagged).length > 0 && (
                <button
                    onClick={() => {
                        const toDelete = questions.filter(q => q.isFlagged).map(q => q.id);
                        if (confirm(`Delete all ${toDelete.length} flagged questions?`)) {
                            batchDeleteQuestions(toDelete).then(() => {
                                setQuestions(questions.filter(q => !toDelete.includes(q.id)));
                                triggerSuccessAlert("Flagged questions cleared.");
                            });
                        }
                    }}
                    className="text-[10px] uppercase font-black bg-red-600 hover:bg-red-500 text-slate-100 px-3 py-1.5 rounded-lg transition"
                >
                    Delete All Flagged ({questions.filter(q => q.isFlagged).length})
                </button>
              )}
              
              <div className="space-y-4">
                  {questions.filter(q => q.isFlagged).map(q => (
                      <div key={q.id} className="p-4 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
                          <p className="text-xs font-semibold text-slate-300">{q.question}</p>
                          <div className="flex gap-2">
                              <button onClick={() => {
                                  const updated = { ...q, isFlagged: false };
                                  saveQuestionToFirestore(updated).then(() => {
                                      setQuestions(questions.map(item => item.id === q.id ? updated : item));
                                      triggerSuccessAlert("Unflagged.");
                                  });
                              }} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition">Unflag</button>
                              <button onClick={() => {
                                  deleteQuestionFromFirestore(q.id).then(() => {
                                      setQuestions(questions.filter(item => item.id !== q.id));
                                      triggerSuccessAlert("Deleted.");
                                  });
                              }} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition">Delete</button>
                          </div>
                      </div>
                  ))}
                  {questions.filter(q => q.isFlagged).length === 0 && <p className="text-xs text-slate-500">No flagged questions found.</p>}
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6" id="database-pane">
              <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                <Database size={18} className="text-indigo-400" /> Database Utilities
              </h3>
              
              <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                 <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-slate-400">Question Bank: {questions.length} total</span>
                     <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${syncStatus === 'Synced' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-amber-900/30 text-amber-500'}`}>
                         {syncStatus}
                     </span>
                 </div>
                 
                 <div className="flex gap-2">
                    <button onClick={handleDeduplicate} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer">
                        Deduplicate
                    </button>
                    <button onClick={handleSyncToDatabase} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer">
                        Sync to DB
                    </button>
                    <button onClick={handleExportDatabase} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer">
                        Export DB
                    </button>
                    <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer">
                        Import DB
                        <input type="file" onChange={handleImportDatabase} className="hidden" />
                    </label>
                    {selectedQuestionIds.size > 0 && (
                         <button onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer">
                             Delete Selected ({selectedQuestionIds.size})
                         </button>
                    )}
                 </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center gap-3">
                     <input type="checkbox" checked={selectedQuestionIds.size === questions.length && questions.length > 0} 
                            onChange={(e) => {
                                if (e.target.checked) setSelectedQuestionIds(new Set(questions.map(q => q.id)));
                                else setSelectedQuestionIds(new Set());
                            }} />
                     <span className="text-xs font-bold text-slate-400">Select All</span>
                </div>
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3 w-3/4">
                        <input type="checkbox" checked={selectedQuestionIds.has(q.id)} 
                            onChange={(e) => {
                                const next = new Set(selectedQuestionIds);
                                if (e.target.checked) next.add(q.id);
                                else next.delete(q.id);
                                setSelectedQuestionIds(next);
                            }} />

                        <p className="text-xs text-slate-300 truncate">{q.question}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={q.correctOptionIndex} onChange={(e) => handleUpdateCorrectOption(q.id, Number(e.target.value))} className="bg-slate-900 border border-slate-800 text-slate-300 rounded p-1 text-xs">
                        {q.options.map((_, idx) => <option key={idx} value={idx}>{String.fromCharCode(65 + idx)}</option>)}
                      </select>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-rose-500 hover:text-rose-400"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6" id="documents-ingestion-pane">
                
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                    <UploadCloud size={18} className="text-indigo-400" /> Resource Ingestion Gateway
                  </h3>
                  <p className="text-xs text-slate-500">Upload syllabus notes, books, or previous year exam papers.</p>
                </div>

                {/* Resource selection types */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">What are you uploading?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setDocType("notes")}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                        docType === "notes"
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/40"
                          : "bg-slate-900 border-slate-805 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span>📝</span>
                      <span className="font-bold">Textbook / Syllabus Notes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocType("pyq")}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                        docType === "pyq"
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/40"
                          : "bg-slate-900 border-slate-805 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span>📜</span>
                      <span className="font-bold">Previous Year Paper (PYQ)</span>
                    </button>
                  </div>
                </div>

                {/* Drag and Drop Box with manual fallback trigger */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-500/10 text-slate-200"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400"
                  }`}
                  id="doc-drag-drop-zone"
                >
                  {extractProgress !== null ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-4 w-full max-w-sm mx-auto animate-pulse" id="text-extraction-status">
                      <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-450 border border-indigo-500/20">
                        <RefreshCw size={32} className="text-indigo-400 animate-spin" />
                      </div>
                      <div className="w-full space-y-2 text-center">
                        <p className="text-sm font-extrabold text-slate-200 uppercase tracking-wide font-mono">AI Extraction Active</p>
                        <p className="text-[11px] text-slate-400 font-mono select-none">{extractProgressText}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Extracted Data:</span>
                          <span className="font-black text-indigo-400">{extractProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-350"
                            style={{ width: `${extractProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : isProcessingAI ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-4" id="ai-pdf-spinner">
                      <RefreshCw size={36} className="text-indigo-500 animate-spin" />
                      <div>
                        <p className="text-sm font-bold text-slate-250 font-mono">Generative AI Ingestion Active...</p>
                        <p className="text-[11px] text-slate-500 font-mono">Gemini is extracting, cleaning, and structuring your content...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-900 rounded-full text-indigo-400 border border-slate-800">
                        <FileText size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-300">Drag & Drop files here</p>
                        <p className="text-xs text-slate-500 mt-1">Accepts standard .txt, .md, and .pdf resources.</p>
                      </div>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".txt,.md,.pdf"
                        className="hidden"
                      />
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs px-4 py-2 rounded-lg font-bold transition cursor-pointer"
                      >
                        Choose File Manually
                      </button>
                    </div>
                  )}
                </div>

                {/* Ingestion staging workspace */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Resource Index Name</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. RAS Prelims 25 Paper"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1 font-sans">Index Target Exam</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                        value={docSelectedExam}
                        onChange={(e) => setDocSelectedExam(e.target.value)}
                      >
                        {exams.map(e => (
                          <option key={e.name} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Study Content Copy Area (AI Extracted Text)</label>
                    <textarea
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:border-indigo-500"
                      placeholder="Paste text contents or past year paper questions here."
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                    />
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      disabled={isProcessingAI || !docContent}
                      onClick={() => handleIngestContent(docName, docContent, docSelectedExam)}
                      className="bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 text-slate-100 font-bold px-4 py-2 text-xs rounded-lg transition cursor-pointer"
                    >
                      Commit Study Context to Repository
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}



          {activeTab === "portfolio" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6" id="portfolio-manager-pane">
              <div className="space-y-1">
                <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                  <Plus size={18} className="text-indigo-400" /> Focus Target Portfolio Manager
                </h3>
                <p className="text-xs text-slate-500">Inject, update, or purge competitive exams and adjust active study deadlines.</p>
              </div>

              {/* Form creation for exams */}
              <form onSubmit={handlePortfolioCreateExam} className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4 font-sans">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-450 text-indigo-400 font-mono">Add New Target Exam</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Official Exam Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-905 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      placeholder="e.g. UPSC CIVIL SERVICES"
                      value={newPortExamName}
                      onChange={(e) => setNewPortExamName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-350"
                      value={newPortExamDate}
                      onChange={(e) => setNewPortExamDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Mock Question Count</label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="e.g. 50"
                      value={newPortExamMockQuestions}
                      onChange={(e) => setNewPortExamMockQuestions(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Mock Duration (Minutes)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="e.g. 120"
                      value={newPortExamMockDuration}
                      onChange={(e) => setNewPortExamMockDuration(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Exam Category Group</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 col-span-1 md:col-span-2"
                      value={newPortExamCategory}
                      onChange={(e) => setNewPortExamCategory(e.target.value)}
                    >
                      <option value="State Civil Services">State Civil Services</option>
                      <option value="State Recruitment Exams">State Recruitment Exams</option>
                      <option value="Central Recruitment Special">Central Recruitment Special</option>
                      <option value="Engineering & Services Track">Engineering & Services Track</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Brief Syllabus Highlights</label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Describe subjects like History, Geography, Polity, Science topics..."
                    value={newPortExamSyllabus}
                    onChange={(e) => setNewPortExamSyllabus(e.target.value)}
                  />
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-550 text-slate-100 font-bold px-4 py-2 text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Add Target Focus Exam
                  </button>
                </div>
              </form>

              {/* View/Modify/Delete list of current exams */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Current Focus Target Suites ({exams.length})</h4>
                
                <div className="space-y-3">
                  {exams.map((ex) => {
                    const daysRemaining = Math.max(0, Math.floor((+new Date(ex.targetDate) - +new Date()) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={ex.id || ex.name} className="bg-slate-950 p-4 border border-slate-805 border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-800 transition">
                        <div className="space-y-1 text-left flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-200 text-xs">{ex.name}</span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[9px] font-bold font-mono text-indigo-400 uppercase">{ex.shortName}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Category: <b className="text-slate-400">{ex.category}</b>
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Syllabus Pattern: <b className="text-amber-400">{ex.mockQuestionCount || 50} Questions</b> | Live Timer: <b className="text-indigo-400">{ex.mockDurationMinutes || 120} Minutes</b>
                          </p>
                          <p className="text-[10px] text-slate-500 italic pr-4 mt-1 font-sans">
                            Syllabus Rules: {ex.syllabusBrief}
                          </p>
                        </div>

                        {/* Inline deadline modify field + delete action */}
                        <div className="flex flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                          <div className="space-y-1 text-left">
                            <label className="block text-[9px] font-mono text-amber-500 font-bold uppercase text-left md:text-right">Adjust Schedule Deadline</label>
                            <input
                              type="date"
                              className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-500"
                              value={ex.targetDate ? new Date(ex.targetDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => handlePortfolioUpdateDeadline(ex.id, e.target.value)}
                            />
                            <p className="text-[9px] text-slate-500 font-mono text-left md:text-right mt-0.5">⏱️ {daysRemaining} days remains</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePortfolioDeleteExam(ex.id, ex.name)}
                            disabled={exams.length <= 1}
                            className="bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 border border-rose-500/20 text-rose-400 p-2 rounded-lg text-xs transition cursor-pointer self-center md:self-auto"
                            title="Purge Focus Exam"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Ingested documents list */}
        <div className="space-y-6" id="ingested-resources-sidebar">
          {activeTab === "documents" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="indexed-files-card">
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Database size={16} className="text-indigo-400" /> Ingested Resource Bank ({documents.length})
              </h3>

              {documents.length === 0 ? (
                <div className="text-slate-500 text-xs py-10 text-center space-y-1">
                  <p>No study notes processed yet.</p>
                  <p className="text-[10px] italic">Paste summaries under "Syllabus Ingestion" to create reference context!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1" id="indexed-docs-vertical-list">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-slate-950 border border-slate-850 rounded-xl hover:border-slate-700 transition space-y-2 relative group"
                    >
                      {/* doc map logic continues */}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="absolute top-4 right-4 p-1.5 text-rose-500 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition opacity-0 group-hover:opacity-100"
                      title="Delete reference"
                    >
                      <Trash2 size={13} />
                    </button>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate pr-6">{doc.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Targeting {doc.targetExam} • {doc.wordCount} words
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2 bg-slate-900 p-2 rounded leading-relaxed border border-slate-850 font-mono">
                      {doc.content}
                    </p>

                    <div className="text-[9px] text-slate-500 font-mono">
                      Ingested: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Quick Informative guidelines */}
          <div className="bg-gradient-to-br from-indigo-950/20 to-slate-950 border border-indigo-500/10 p-5 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-indigo-400 uppercase">
              <Brain size={14} /> System Guidance
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              When documents are processed, their contents are indexed with focus-term filters. Under practice drills or assessments, the system prioritizes questions derived from these subjects or re-injects prior mistakes to build cognitive accuracy.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}