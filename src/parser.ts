import { Question } from './types';

/**
 * Intelligent, multi-strategy HTML Parse Engine for MCQ mock tests.
 * Extracts questions, options, correct answers, and explanations.
 */
export function parseHtmlToQuestions(htmlContent: string, targetExam: string): Question[] {
  // Strategy 0: Check if mock test is a dynamic script key-value quiz format
  let questions = tryExtractQuestionsFromScripts(htmlContent, targetExam);
  if (questions.length >= 5) {
    console.log(`Parsed ${questions.length} questions using Strategy 0 (Script variables)`);
    return questions;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove elements that are noise for HTML structure
  const cleanDoc = doc.cloneNode(true) as Document;
  cleanDoc.querySelectorAll('script, style, meta, link, head, iframe, svg, noscript').forEach(el => el.remove());

  // Strategy 1: Check form input radio elements
  const radioQuestions = tryFormRadioParsing(cleanDoc, targetExam);
  if (radioQuestions.length >= 5) {
    console.log(`Parsed ${radioQuestions.length} questions using Strategy 1 (Radio elements)`);
    return radioQuestions;
  }

  // Strategy 2: Structured DOM Traversal (lists, blocks, grids)
  const domQuestions = tryStructuredDomParsing(cleanDoc, targetExam);
  if (domQuestions.length >= 5) {
    console.log(`Parsed ${domQuestions.length} questions using Strategy 2 (DOM structure)`);
    return domQuestions;
  }

  // Strategy 3: Text Heuristics line scanning (Most Resilient Fallback)
  const textQuestions = tryTextHeuristicParsing(cleanDoc, targetExam);
  console.log(`Parsed ${textQuestions.length} questions using Strategy 3 (Heuristic Text Scanning)`);
  return textQuestions;
}

/**
 * Helper to parse clean question number and body.
 */
function extractQuestionNumberAndBody(text: string): { num: number | null; body: string } {
  const cleanText = text.trim();
  // Standard formats: "Question 5: What is...", "Q55. Why...", "प्र. 5: ", "प्रश्न 6- "
  const questionPrefixRegex = /^\s*(?:[Qq]uestion|[Qq]\s*\.?|[Pp]rashna|[प्प्र]श्न|[प्प्र]\s*\.?)\s*(\d+)\s*[\.\):\-\s]+/i;
  let match = cleanText.match(questionPrefixRegex);
  if (match) {
    const num = parseInt(match[1]);
    const body = cleanText.substring(match[0].length).trim();
    return { num, body };
  }

  // Numerals fallback: "1. Under which article...", "101) Name of..."
  const literalNumRegex = /^\s*(\d+)\s*[\.\):\-\sऽ]+\s*/;
  match = cleanText.match(literalNumRegex);
  if (match) {
    const num = parseInt(match[1]);
    const body = cleanText.substring(match[0].length).trim();
    return { num, body };
  }

  return { num: null, body: cleanText };
}

/**
 * Utility to strip HTML tags, especially style, script and header metadata tags
 * so questions render cleanly as pure, human-usable text content.
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('style, script, head, link, meta, title').forEach(el => el.remove());
    return (doc.body.textContent || doc.body.innerText || '').trim();
  } catch (e) {
    // Basic fallback if context doesn't support DOMParser
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

/**
 * Strategy 0: Parse Script tags.
 * Extract questions array assigned directly as a JS array keyword block.
 */
function tryExtractQuestionsFromScripts(htmlContent: string, targetExam: string): Question[] {
  const questions: Question[] = [];
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const scriptContent = match[1];
    
    // Specifically search for questions/question-like variable assignments
    const questionsArrayRegex = /(?:const|let|var)?\s*questions\s*=\s*(\[[\s\S]+?\])\s*;/i;
    let arrayMatch = questionsArrayRegex.exec(scriptContent);
    
    // Fallback: search for any list assignment which contains mcq properties inside
    if (!arrayMatch) {
      const genericArrayRegex = /(?:const|let|var)?\s*[a-zA-Z0-9_]+\s*=\s*(\[[\s\S]+?\])\s*;/gi;
      let genMatch;
      while ((genMatch = genericArrayRegex.exec(scriptContent)) !== null) {
        const potentialArrayStr = genMatch[1];
        if (potentialArrayStr.includes('question') && (potentialArrayStr.includes('answer') || potentialArrayStr.includes('option_1'))) {
          arrayMatch = genMatch;
          break;
        }
      }
    }

    if (arrayMatch) {
      const arrayStr = arrayMatch[1];
      try {
        // Safe context evaluation of standard JS object literal block using Function
        const parsed = (new Function(`return ${arrayStr}`))();
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((item, idx) => {
            const rawQuestion = item.question || item.q || item.title || item.text || item.questionText;
            if (!rawQuestion) return;

            // Strip styling and elements to get clean text
            const questionText = stripHtmlTags(rawQuestion);
            if (!questionText.trim()) return;

            // Collect options (supporting explicit array or option_X properties)
            let opts: string[] = [];
            if (Array.isArray(item.options || item.choices || item.answers)) {
              opts = item.options || item.choices || item.answers;
            } else {
              for (let i = 1; i <= 10; i++) {
                const optVal = item[`option_${i}`] || item[`choice_${i}`] || item[`opt_${i}`];
                if (optVal !== undefined && String(optVal).trim()) {
                  opts.push(String(optVal));
                }
              }
            }

            // Strip HTML style blocks from options
            const cleanOpts = opts.map(o => stripHtmlTags(o));

            // Select correct option mapping (handles numeric options or string/letter/hindi symbols)
            const ans = item.answer || item.correct || item.correctIndex || item.correctAnswer || item.ans;
            let correctOptionIdx = 0;
            if (ans !== undefined) {
              if (typeof ans === 'number') {
                if (ans >= 1 && ans <= 10) {
                  correctOptionIdx = ans - 1;
                } else {
                  correctOptionIdx = ans;
                }
              } else if (typeof ans === 'string') {
                const trimmedAns = ans.trim();
                const numVal = parseInt(trimmedAns);
                if (!isNaN(numVal) && numVal >= 1 && numVal <= 10) {
                  correctOptionIdx = numVal - 1;
                } else {
                  const cleanedTerm = trimmedAns.toLowerCase();
                  const foundIndex = cleanOpts.findIndex(opt => opt.toLowerCase().trim() === cleanedTerm);
                  if (foundIndex !== -1) {
                    correctOptionIdx = foundIndex;
                  } else {
                    const symbol = cleanedTerm.toUpperCase();
                    if (symbol === 'A' || symbol === 'अ' || symbol === 'ए' || symbol === '1') correctOptionIdx = 0;
                    else if (symbol === 'B' || symbol === 'ब' || symbol === 'बी' || symbol === '2') correctOptionIdx = 1;
                    else if (symbol === 'C' || symbol === 'स' || symbol === 'सी' || symbol === '3') correctOptionIdx = 2;
                    else if (symbol === 'D' || symbol === 'द' || symbol === 'डी' || symbol === '4') correctOptionIdx = 3;
                  }
                }
              }
            }

            // Extract Solution Explanation
            const rawExplanation = item.solution_text || item.explanation || item.exp || item.desc || item.solution || '';
            const explanationText = stripHtmlTags(rawExplanation) || 'Extracted from HTML mock test.';

            questions.push(buildQuestionObject(
              `inj-${Date.now()}-${idx}`,
              questionText,
              cleanOpts,
              correctOptionIdx,
              targetExam,
              explanationText
            ));
          });
        }
      } catch (err) {
        console.error("Error evaluating scripts inside tryExtractQuestionsFromScripts:", err);
      }
    }
  }

  return questions;
}

/**
 * Strategy 1: Form Radio Group Parsing
 */
function tryFormRadioParsing(doc: Document, targetExam: string): Question[] {
  const questions: Question[] = [];
  const radioInputs = doc.querySelectorAll('input[type="radio"]');
  const groups: Record<string, HTMLInputElement[]> = {};

  radioInputs.forEach(input => {
    const name = input.getAttribute('name');
    if (name) {
      if (!groups[name]) groups[name] = [];
      groups[name].push(input as HTMLInputElement);
    }
  });

  const names = Object.keys(groups);
  names.forEach((name, index) => {
    const inputs = groups[name];
    if (inputs.length < 2) return;

    const options: string[] = [];
    let correctIdx = 0;

    inputs.forEach((input, optIdx) => {
      let optText = '';
      const id = input.getAttribute('id');
      if (id) {
        const label = doc.querySelector(`label[for="${id}"]`);
        if (label) optText = label.textContent || '';
      }
      
      if (!optText.trim()) {
        const nextSibling = input.nextSibling;
        if (nextSibling && nextSibling.textContent?.trim()) {
          optText = nextSibling.textContent;
        } else if (input.parentElement) {
          optText = input.parentElement.textContent || '';
          optText = optText.replace(/^[A-Da-d1-4अबसदएबीसीडी][\.\)\-\s]/, '');
        }
      }

      const cleanOpt = cleanText(optText);
      options.push(cleanOpt || `Option ${optIdx + 1}`);

      const isChecked = input.hasAttribute('checked') || input.checked;
      const isSuccessClass = input.classList.contains('correct') || input.parentElement?.classList.contains('correct') || input.parentElement?.classList.contains('answer');
      if (isChecked || isSuccessClass) {
        correctIdx = optIdx;
      }
    });

    const firstInput = inputs[0];
    let questionText = '';
    let container: HTMLElement | null = firstInput.parentElement;
    for (let depth = 0; depth < 4; depth++) {
      if (!container) break;
      const prev = container.previousElementSibling;
      if (prev && prev.textContent?.trim()) {
        questionText = prev.textContent;
        break;
      }
      container = container.parentElement;
    }

    if (!questionText.trim()) {
      questionText = firstInput.parentElement?.textContent?.split('\n')[0] || `Question ${index + 1}`;
    }

    const { body: cleanedBody } = extractQuestionNumberAndBody(questionText);

    if (cleanedBody && options.length >= 2) {
      questions.push(buildQuestionObject(`radio-${index}`, cleanedBody, options, correctIdx, targetExam));
    }
  });

  return questions;
}

/**
 * Strategy 2: Structured DOM matching
 */
function tryStructuredDomParsing(doc: Document, targetExam: string): Question[] {
  const questions: Question[] = [];
  const candidateElements = doc.querySelectorAll('p, li, div, h3, h4, tr');
  const questionNumRegex = /^\s*(?:[Qq]uestion|[Qq]\s*\.?|[Pp]rashna|[प्प्र]श्न|[प्प्र]\s*\.?|[0-9]+)\s*(\d+)?[\.\):\-\sऽ]/i;

  candidateElements.forEach((el, index) => {
    const text = el.textContent || '';
    if (!questionNumRegex.test(text)) return;

    // Skip if it contains inline options (handled by line scanning / heuristic parser better)
    if (text.includes('(A)') && text.includes('(B)')) return;
    if (text.includes('(अ)') && text.includes('(ब)')) return;

    const { body: questionText } = extractQuestionNumberAndBody(text);
    if (questionText.length < 5) return;

    const options: string[] = [];
    let correctIdx = 0;
    const siblingNodes: string[] = [];
    let sibling = el.nextElementSibling;
    
    while (sibling && siblingNodes.length < 6) {
      const sibText = sibling.textContent || '';
      if (questionNumRegex.test(sibText)) break;
      
      const cleanSib = cleanText(sibText);
      if (cleanSib) {
        siblingNodes.push(cleanSib);
        const classStr = (sibling.className || '').toLowerCase();
        if (classStr.includes('correct') || classStr.includes('success') || classStr.includes('selected') || sibling.querySelector('.correct, .selected-answer')) {
          correctIdx = siblingNodes.length - 1;
        }
      }
      sibling = sibling.nextElementSibling;
    }

    const optionPrefix = /^[A-Da-d1-4अबसदएबीसीडी\(\[\]][\.\)\-\s]/;
    const cleanOptions = siblingNodes.filter(s => optionPrefix.test(s));
    const finalOptions = cleanOptions.length >= 2 ? cleanOptions : siblingNodes.slice(0, 4);

    if (finalOptions.length >= 2) {
      const sanitizedOptions = finalOptions.map(opt => opt.replace(/^[A-Da-d1-4अबसदएबीसीडी\(\[\]]+[\.\)\-\s]*/i, '').trim());
      questions.push(buildQuestionObject(`dom-${index}`, questionText, sanitizedOptions, correctIdx, targetExam));
    }
  });

  return questions;
}

/**
 * Strategy 3: Heuristic Regex Text Parser (The Most Universal Fallback)
 * Converts HTML elements to structured text with linebreaks and groups blocks into custom questions.
 */
function tryTextHeuristicParsing(doc: Document, targetExam: string): Question[] {
  const questions: Question[] = [];
  
  // Custom walker that inserts smart margins
  const walkNodes = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    let text = '';
    const name = node.nodeName.toLowerCase();
    
    if (name === 'br' || name === 'p' || name === 'div' || name === 'li' || name === 'tr' || name === 'h1' || name === 'h2' || name === 'h3' || name === 'h4' || name === 'option') {
      text += '\n';
    }

    node.childNodes.forEach(child => {
      text += walkNodes(child);
    });

    if (name === 'p' || name === 'div' || name === 'li' || name === 'tr' || name === 'h1' || name === 'h2' || name === 'h3' || name === 'h4') {
      text += '\n';
    }
    return text;
  };

  const fullText = walkNodes(doc.body);
  const lines = fullText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // We will first extract any global answer key block if present
  const answerKeys = tryExtractAnswerKey(lines);
  console.log("Global Answer Key detected:", answerKeys);

  // Broad matching regexes for identifying sections
  const questionStartRegex = /^\s*(?:[Qq]uestion|[Qq]\s*\.?|Prashna|Q\s*-\s*|[प्प्र]श्न|[प्प्र]\s*\.?)\s*(\d+)/i;
  const literalNumberStartRegex = /^\s*(\d+)\s*[\.\):\-\sऽ]/;

  // Patterns matching an option start eg. "(A) Jaipur", "(अ) जयपुर", "A. Delhi", "1) Bharat"
  const optionPrefixRegex = /^\s*[\(\[]?([A-Da-d1-4अबसदएबीसीडी])[\)\]\.\-\s]\s*(.*)$/i;

  let currentQuestion: string = '';
  let currentQuestionNum: number | null = null;
  let currentOptions: string[] = [];
  let correctOptionIdx = 0;
  let explanation: string = '';
  let isParsingExplanation = false;

  const flushQuestion = (index: number) => {
    if (currentQuestion) {
      let finalOptions = [...currentOptions];

      // If we didn't collect individual option lines but the question contains inline options, extract them
      if (finalOptions.length === 0) {
        const extracted = extractInlineOptions(currentQuestion);
        if (extracted.options.length >= 2) {
          currentQuestion = extracted.questionText;
          finalOptions = extracted.options;
          correctOptionIdx = extracted.correctIdx;
        }
      }

      // Format individual collected options to remove option labels
      const formattedOptions = finalOptions.map(opt => {
        return opt.replace(/^[\(\[\]]?\s*([A-Da-d1-4अबसदएबीसीडी])\s*[\)\]\.\-\sऽ]+/i, '').trim();
      });

      // Override correct answer with global answer keys if found
      if (currentQuestionNum !== null && answerKeys[currentQuestionNum] !== undefined) {
        correctOptionIdx = answerKeys[currentQuestionNum];
      }

      // Only push if we have at least 2 potential options
      if (formattedOptions.length >= 2) {
        questions.push(buildQuestionObject(
          `heuristic-${Date.now()}-${index}`,
          currentQuestion,
          formattedOptions,
          correctOptionIdx,
          targetExam,
          explanation
        ));
      }
    }
    
    // Reset states
    currentQuestion = '';
    currentQuestionNum = null;
    currentOptions = [];
    correctOptionIdx = 0;
    explanation = '';
    isParsingExplanation = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates an Answer Key block or starts Answer Key section
    if (/^(?:answer\s*key|answers|उत्तरमाला|उत्तर\s*कुंजी|उत्तर\s*तालिका|key)/i.test(line)) {
      // Once we reach global answer keys, we can stop parsing questions
      flushQuestion(i);
      break;
    }

    // Check if line is a question start
    const isQuestionStart = questionStartRegex.test(line) || literalNumberStartRegex.test(line);

    if (isQuestionStart) {
      flushQuestion(i);
      const { num, body } = extractQuestionNumberAndBody(line);
      currentQuestion = body;
      currentQuestionNum = num;
      continue;
    }

    // Check if line indicates correct answer (inline fallback)
    // eg. "Ans: A", "Answer: 3", "Correct Option: B", "उत्तर: (B)"
    const ansLower = line.toLowerCase();
    const isAnsLine = ansLower.startsWith('ans') || 
                      ansLower.startsWith('correct') || 
                      ansLower.startsWith('answer') || 
                      ansLower.startsWith('उत्तर') || 
                      ansLower.startsWith('उत्तर:');

    if (isAnsLine && currentQuestion) {
      // Match A-D, 1-4, or Hindi characters
      const match = line.match(/(?:[aA]ns|[cC]orrect|[aA]nswer|[उउ]त्तर|:)\s*[\(\[\s]*([A-Da-d1-4अबसदएबीसीडी])[\)\]\s]*/);
      if (match && match[1]) {
        const symbol = match[1].toUpperCase();
        if (symbol === 'A' || symbol === '1' || symbol === 'अ' || symbol === 'ए') correctOptionIdx = 0;
        else if (symbol === 'B' || symbol === '2' || symbol === 'ब' || symbol === 'बी') correctOptionIdx = 1;
        else if (symbol === 'C' || symbol === '3' || symbol === 'स' || symbol === 'सी') correctOptionIdx = 2;
        else if (symbol === 'D' || symbol === '4' || symbol === 'द' || symbol === 'डी') correctOptionIdx = 3;
      }
      isParsingExplanation = true;
      continue;
    }

    // Check if line is Option line
    if (optionPrefixRegex.test(line) && currentQuestion && !isParsingExplanation) {
      // Check for inline multi-choices inside same line (e.g. (A) jaipur (B) jodhpur)
      if (line.includes('(B)') || line.includes('(ब)')) {
        const inlineOpts = Array.from(line.matchAll(/[\(\[]?([A-Da-d1-4अबसदएबीसीडी])[\)\]\.\-\sऽ]+([^\(\[\n]+)/gi));
        if (inlineOpts.length >= 2) {
          inlineOpts.forEach(m => {
            currentOptions.push(m[0].trim());
          });
          continue;
        }
      }
      currentOptions.push(line);
      continue;
    }

    // Parse Explanation
    if (isParsingExplanation && currentQuestion) {
      explanation += (explanation ? ' ' : '') + line;
      continue;
    }

    if (ansLower.startsWith('explanation') || ansLower.startsWith('व्याख्या') || ansLower.startsWith('sol.')) {
      isParsingExplanation = true;
      explanation = line.replace(/^(explanation|व्याख्या|sol\.)\s*:?/i, '').trim();
      continue;
    }

    // Assemble question description body lines
    if (currentQuestion && currentOptions.length === 0 && !isParsingExplanation) {
      // Check if line itself contains inline options
      if ((line.includes('(A)') && line.includes('(B)')) || (line.includes('(अ)') && line.includes('(ब)'))) {
        const inlineOpts = Array.from(line.matchAll(/[\(\[]?([A-Da-d1-4अबसदएबीसीडी])[\)\]\.\-\sऽ]+([^\(\[\n]+)/gi));
        if (inlineOpts.length >= 2) {
          inlineOpts.forEach(m => {
            currentOptions.push(m[0].trim());
          });
          continue;
        }
      }
      currentQuestion += '\n' + line;
    }
  }

  flushQuestion(lines.length);

  return questions;
}

/**
 * Parses inline string option layout
 * eg. "Capital is: (A) Jaipur (B) Delhi (C) Udaipur (D) Kota"
 */
function extractInlineOptions(text: string): { questionText: string; options: string[]; correctIdx: number } {
  let questionText = text;
  const options: string[] = [];
  let correctIdx = 0;

  // Pattern 1: (A)/(B)/(C)/(D) or (अ)/(ब)/(स)/(द)
  const patternA = /[\(\[]?(A|अ|ए)[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?(B|ब|बी)[\)\]\.\-\sऽ]|$)/gi;
  const patternB = /[\(\[]?(B|ब|बी)[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?(C|स|सी)[\)\]\.\-\sऽ]|$)/gi;
  const patternC = /[\(\[]?(C|स|सी)[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?(D|द|डी)[\)\]\.\-\sऽ]|$)/gi;
  const patternD = /[\(\[]?(D|द|डी)[\)\]\.\-\sऽ]+([\s\S]*?)(?=$)/gi;

  const matchA = text.match(patternA);
  const matchB = text.match(patternB);
  const matchC = text.match(patternC);
  const matchD = text.match(patternD);

  if (matchA && matchB) {
    options.push(matchA[0].trim());
    options.push(matchB[0].trim());
    if (matchC) options.push(matchC[0].trim());
    if (matchD) options.push(matchD[0].trim());

    const firstOptIdx = text.search(/[\(\[]?(A|अ|ए)[\)\]\.\-\sऽ]/i);
    if (firstOptIdx !== -1) {
      questionText = text.substring(0, firstOptIdx).trim();
    }
  } else {
    // Try numerals pattern: (1)/(2)/(3)/(4) or 1./2./3./4.
    const pattern1 = /[\(\[]?1[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?2[\)\]\.\-\sऽ]|$)/;
    const pattern2 = /[\(\[]?2[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?3[\)\]\.\-\sऽ]|$)/;
    const pattern3 = /[\(\[]?3[\)\]\.\-\sऽ]+([\s\S]*?)(?=[\(\[]?4[\)\]\.\-\sऽ]|$)/;
    const pattern4 = /[\(\[]?4[\)\]\.\-\sऽ]+([\s\S]*?)(?=$)/;

    const match1 = text.match(pattern1);
    const match2 = text.match(pattern2);
    const match3 = text.match(pattern3);
    const match4 = text.match(pattern4);

    if (match1 && match2) {
      options.push(match1[0].trim());
      options.push(match2[0].trim());
      if (match3) options.push(match3[0].trim());
      if (match4) options.push(match4[0].trim());

      const firstOptIdx = text.search(/[\(\[]?1[\)\]\.\-\sऽ]/);
      if (firstOptIdx !== -1) {
        questionText = text.substring(0, firstOptIdx).trim();
      }
    }
  }

  return { questionText, options, correctIdx };
}

/**
 * Smart Answer Key extractor
 */
function tryExtractAnswerKey(lines: string[]): Record<number, number> {
  const answerKey: Record<number, number> = {};
  let isAnswerKeySection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(?:answer\s*key|answers|उत्तरमाला|उत्तर\s*कुंजी|उत्तर\s*तालिका|key)/i.test(line)) {
      isAnswerKeySection = true;
      continue;
    }

    if (isAnswerKeySection) {
      // Pull matches like:  "1 - A" , "2. B" , "3(C)" , "4: A" , "5 - अ" or "10 - (ब)"
      const matches = Array.from(line.matchAll(/(\d+)\s*[\.\-\:\(]*\s*([A-Da-d1-4अबसदएबीसीडी])\s*[\)\.]?/g));
      matches.forEach(m => {
        const qNum = parseInt(m[1]);
        const val = m[2].trim().toUpperCase();
        let optIdx = 0;
        if (val === 'A' || val === '1' || val === 'अ' || val === 'ए') optIdx = 0;
        else if (val === 'B' || val === '2' || val === 'ब' || val === 'बी') optIdx = 1;
        else if (val === 'C' || val === '3' || val === 'स' || val === 'सी') optIdx = 2;
        else if (val === 'D' || val === '4' || val === 'द' || val === 'डी') optIdx = 3;
        
        answerKey[qNum] = optIdx;
      });
    }
  }
  return answerKey;
}

/**
 * Text cleanup utilities
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Standardized constructor of Question object structure
 */
function buildQuestionObject(
  id: string,
  question: string,
  options: string[],
  correctOptionIndex: number,
  targetExam: string,
  explanationText?: string
): Question {
  let finalOpts = [...options];
  
  if (finalOpts.length < 4) {
    const defaultLabels = ['Option A', 'Option B', 'Option C', 'Option D'];
    while (finalOpts.length < 4) {
      finalOpts.push(defaultLabels[finalOpts.length]);
    }
  } else if (finalOpts.length > 4) {
    finalOpts = finalOpts.slice(0, 4);
  }

  return {
    id,
    question: question.trim(),
    options: finalOpts.map(o => o.trim()),
    correctOptionIndex: correctOptionIndex < 0 || correctOptionIndex > 3 ? 0 : correctOptionIndex,
    explanation: explanationText?.trim() || 'Extracted from HTML mock test.',
    subject: 'General Knowledge',
    topic: 'Mock Test Ingestion',
    subtopic: 'HTML Ingested MCQ',
    difficulty: 'medium',
    sourceType: 'pyq',
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: targetExam || 'General Study'
  };
}
