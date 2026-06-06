import { useState } from "react";
import { Brain, Sparkles, Loader2, Target, FileText, Type } from "lucide-react";

export default function MCQGenerator({ onQuestionsGenerated }: { onQuestionsGenerated: (q: any[]) => void }) {
  const [topic, setTopic] = useState("");
  const [generateFrom, setGenerateFrom] = useState("text"); // 'pdf' or 'text'
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<string[]>(["medium"]);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq"]);
  const [model, setModel] = useState("gemini-2.0-flash");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setProgress("0 / " + numQuestions + " generated");
    
    let allGeneratedQuestions: any[] = [];
    const batchSize = 5;
    const totalBatches = Math.ceil(numQuestions / batchSize);

    try {
      for (let i = 0; i < totalBatches; i++) {
        const currentBatch = Math.min(batchSize, numQuestions - (i * batchSize));
        setProgress(`${i * batchSize} / ${numQuestions} generated...`);
        
        const resp = await fetch("/api/generate-mcqs-from-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            numQuestions: currentBatch,
            documentContent: topic,
            documentName: topic,
            model,
            difficulty,
            difficultyAdaptive: true, // Adaptive scaling enabled
          }),
        });
        
        const data = await resp.json();
        if (data.success && data.questions) {
          allGeneratedQuestions = [...allGeneratedQuestions, ...data.questions];
        }
      }
      
      onQuestionsGenerated(allGeneratedQuestions);
    } catch (err) {
      console.error("Failed to generate MCQs:", err);
      alert("Failed to generate MCQs. Please try again.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
          <Sparkles size={18} />
        </div>
        <h3 className="font-extrabold text-slate-100 text-base">AI MCQ Generator</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Generate From</label>
          <div className="flex gap-2">
            <button onClick={() => setGenerateFrom("pdf")} className={`flex-1 flex gap-2 items-center justify-center py-2 rounded-lg text-xs font-semibold ${generateFrom === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'}`}><FileText size={16}/> PDF</button>
            <button onClick={() => setGenerateFrom("text")} className={`flex-1 flex gap-2 items-center justify-center py-2 rounded-lg text-xs font-semibold ${generateFrom === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'}`}><Type size={16}/> Text</button>
          </div>
        </div>

        <input
          type="text"
          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
          placeholder="Topic, Subject or Context..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Questions</label>
              <input type="number" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-2 text-base md:text-xs text-slate-200" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} />
            </div>
            
            <div>
             <label className="block text-xs font-bold text-slate-400 mb-1">Model</label>
              <select
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-2 text-xs text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="llama3-70b-8192">Groq Llama 3</option>
                <option value="gpt-4o">ChatGPT GPT-4o</option>
              </select>
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Difficulty</label>
            <div className="flex flex-wrap gap-2">
                {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(prev => prev.includes(d) ? prev.filter(i => i !== d) : [...prev, d])} className={`px-3 py-1 rounded-full text-xs font-semibold ${difficulty.includes(d) ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'}`}>{d}</button>
                ))}
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Types</label>
            <div className="flex flex-wrap gap-2">
                {['mcq', 'statement', 'assertion', 'match'].map(t => (
                    <button key={t} onClick={() => setQuestionTypes(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t])} className={`px-3 py-1 rounded-full text-xs font-semibold ${questionTypes.includes(t) ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'}`}>{t}</button>
                ))}
            </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
          {loading ? progress : "Generate MCQs"}
        </button>
      </div>
    </div>
  );
}
