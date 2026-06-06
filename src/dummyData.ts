/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, SourceDocument } from "./types";

export const initialExams = [
  {
    id: "exam-ras",
    name: "RAS MAINS",
    shortName: "RAS",
    targetDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(), // 85 days from now
    category: "Rajasthan Administrative Services",
    totalVacancy: 905,
    syllabusBrief: "General Studies I, II, III, & General Hindi/English descriptive/conceptual papers.",
    difficultyWeightage: "Hard"
  },
  {
    id: "exam-eoro",
    name: "EO RO",
    shortName: "EO/RO",
    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    category: "Executive Officer / Revenue Officer Exam",
    totalVacancy: 111,
    syllabusBrief: "Rajasthan Municipality Act 2009, Urban Development, Civic Administration, and Rajasthan Art & Culture.",
    difficultyWeightage: "Medium"
  },
  {
    id: "exam-raspre",
    name: "RAS PRE",
    shortName: "RAS Pre",
    targetDate: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000).toISOString(), // 110 days from now
    category: "Rajasthan Administrative Services (Preliminary)",
    totalVacancy: 905,
    syllabusBrief: "General Knowledge & General Science screening examination carrying 150 administrative multiple choice questions.",
    difficultyWeightage: "Medium"
  },
  {
    id: "exam-dsssb",
    name: "DSSSB TGT",
    shortName: "DSSSB",
    targetDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), // 42 days from now
    category: "Delhi Subordinate Services Selection Board",
    totalVacancy: 5118,
    syllabusBrief: "General Intelligence, Arithmetical Ability, General Awareness, and teaching methodology Section B.",
    difficultyWeightage: "Medium"
  },
  {
    id: "exam-rgk",
    name: "RAJASTHAN GK",
    shortName: "RAJ",
    targetDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days from now
    category: "State Recruitment Exams Special",
    totalVacancy: 12000,
    syllabusBrief: "Rajasthan geographical features, water channels, cultural visual arts, rulers, and historic revolutions.",
    difficultyWeightage: "Medium"
  },
  {
    id: "exam-ca",
    name: "CURRENT AFFAIRS - GENERAL",
    shortName: "CA",
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    category: "National & International Events",
    totalVacancy: 15300,
    syllabusBrief: "New technological innovations, government missions, space launches, international conferences.",
    difficultyWeightage: "Medium"
  }
];

export const initialQuestions: Question[] = [
  {
    id: "ras-001",
    question: "Considering the Rajasthan Public Service Commission (RPSC), from which constitutional article (Part XIV) does the commission derive its statutory authority, powers, and duties to conduct civil service recruitment?",
    options: [
      "Article 315 to 323",
      "Article 243 to 251",
      "Article 352 to 360",
      "Article 152 to 167"
    ],
    correctOptionIndex: 0,
    explanation: "State Public Service Commissions (including the RPSC in Ajmer, Rajasthan) are constitutional bodies established and assigned executive responsibilities under Articles 315 through 323 of Part XIV of the Constitution of India.",
    subject: "Administrative Studies",
    topic: "Polity & Administration",
    subtopic: "Constitutional Bodies",
    difficulty: "medium",
    sourceType: "pyq",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAS MAINS"
  },
  {
    id: "ras-002",
    question: "To improve administrative transparency in Rajasthan, the Jan Soochna Portal was launched in September 2019. Under which Section of the Right to Information Act, 2005 does this portal proactively disclose department statistics?",
    options: [
      "Section 4(2)",
      "Section 8(1)",
      "Section 12(3)",
      "Section 19"
    ],
    correctOptionIndex: 0,
    explanation: "The Jan Soochna Portal is an initiative of the Government of Rajasthan to comply with Section 4(2) of the Right to Information (RTI) Act, 2005, which mandates proactive disclosure of public utility information to citizens.",
    subject: "Governance studies",
    topic: "Governance",
    subtopic: "Transparency & Digital Initiatives",
    difficulty: "hard",
    sourceType: "pyq",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAS MAINS"
  },
  {
    id: "ras-003",
    question: "The Rajasthan Tenancy Act was enacted in 1955. Which of the following primary land tenure categories was introduced by this legislation to unify tenancy conditions and protect farmers?",
    options: [
      "Khatedar and Gair-Khatedar Tenants",
      "Jagirdar and Zamindar elite tier",
      "Bhumichara and Ryotwari divisions",
      "Patta and Inam revenue holdings"
    ],
    correctOptionIndex: 0,
    explanation: "The landmark Rajasthan Tenancy Act, 1955 unified the multi-layered state agrarian rules into simplified tenures, establishing 'Khatedar' (with transferable occupancy rights) and 'Gair-Khatedar' (non-transferable temporary) tenants.",
    subject: "Rajasthan Economy",
    topic: "Land Reforms",
    subtopic: "Rajasthan Tenancy Act 1955",
    difficulty: "hard",
    sourceType: "general",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAS MAINS"
  },
  {
    id: "rgk-001",
    question: "The Aravalli range acts as a critical water divide in Rajasthan. Which of the following river drainage basins is located to the West of the Aravalli divide?",
    options: [
      "Luni River Basin",
      "Chambal River Basin",
      "Banas River Basin",
      "Banganga River Basin"
    ],
    correctOptionIndex: 0,
    explanation: "The Aravalli range splits Rajasthan diagonally. Rivers flowing west, such as the Luni, drain into the Rann of Kutch (Thar desert region), whereas the Chambal, Banas, and Banganga lay to the east of the divide, flowing towards the Yamuna-Ganga system.",
    subject: "Geography of Rajasthan",
    topic: "Geography",
    subtopic: "Drainage Systems",
    difficulty: "medium",
    sourceType: "pyq",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAJASTHAN GK"
  },
  {
    id: "rgk-002",
    question: "Under the historic Mewar school of painting, which famous ruler's reign is considered the Golden Age of Mewar miniature painting, marked by the creation of the Raga Mala series by artist Sahibdin?",
    options: [
      "Maharana Jagat Singh I",
      "Maharana Kumbha",
      "Maharana Pratap",
      "Maharana Raj Singh"
    ],
    correctOptionIndex: 0,
    explanation: "The reign of Maharana Jagat Singh I (1628-1652) is universally celebrated as the Golden Age of Mewar miniatures. Outstanding court artists like Sahibdin and Manohar were commissioned to paint extensive manuscripts of the Ramayana and Raga Mala.",
    subject: "Rajasthan Heritage",
    topic: "Art & Culture",
    subtopic: "Mewar Painting School",
    difficulty: "hard",
    sourceType: "pyq",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAJASTHAN GK"
  },
  {
    id: "rgk-003",
    question: "Which of the following forts of Rajasthan is historically distinguished for its extensive fortification wall extending roughly 36 kilometers, considered the second longest continuous wall globally after the Great Wall of China?",
    options: [
      "Kumbhalgarh Fort",
      "Mehrangarh Fort",
      "Chittor Fort",
      "Ranthambore Fort"
    ],
    correctOptionIndex: 0,
    explanation: "Kumbhalgarh Fort, built by Maharana Kumbha in the 15th century, boasts a spectacular protective outer wall extending 36 km, which is wide enough for eight horses to run abreast.",
    subject: "Rajasthan Heritage",
    topic: "Fort Architecture",
    subtopic: "Mewar Fortified Sites",
    difficulty: "easy",
    sourceType: "general",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAJASTHAN GK"
  },
  {
    id: "tgt-001",
    question: "According to the National Education Policy (NEP 2020), what is the revamped pedagogical structure configured to replace the traditional 10+2 academic structure in schools?",
    options: [
      "5 + 3 + 3 + 4 structure",
      "3 + 4 + 4 + 5 structure",
      "5 + 4 + 3 + 3 structure",
      "4 + 4 + 3 + 2 structure"
    ],
    correctOptionIndex: 0,
    explanation: "NEP 2020 introduces the 5+3+3+4 framework: Foundational (5 years, ages 3-8), Preparatory (3 years, ages 8-11), Middle (3 years, ages 11-14), and Secondary (4 years, ages 14-18).",
    subject: "Pedagogy",
    topic: "Teaching Methodology",
    subtopic: "National Education Policy",
    difficulty: "easy",
    sourceType: "general",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "DSSSB TGT"
  },
  {
    id: "tgt-002",
    question: "In Lev Vygotsky's Sociocultural Theory of learning, what term refers to the temporary supportive framework provided by an expert individual to a learner during problem solving?",
    options: [
      "Scaffolding",
      "Zone of Proximal Development",
      "Assimilation",
      "Self-Regulation Schema"
    ],
    correctOptionIndex: 0,
    explanation: "Vygotsky's theory highlights 'Scaffolding' as the scaffold of assistance provided by a More Knowledgeable Other (MKO) which is gradually removed as the child masters the concept within their Zone of Proximal Development (ZPD).",
    subject: "Psychology",
    topic: "Child Development",
    subtopic: "Cognitive Theories",
    difficulty: "medium",
    sourceType: "general",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "DSSSB TGT"
  },
  {
    id: "ca-001",
    question: "Under the India Semiconductor Mission (ISM), which state is home to India's first commercial semiconductor fabrication facility being established by Tata Electronics and PSMC?",
    options: [
      "Gujarat (Dholera)",
      "Maharashtra (Taloja)",
      "Tamil Nadu (Sriperumbudur)",
      "Karnataka (Whitefield)"
    ],
    correctOptionIndex: 0,
    explanation: "India's first commercial semiconductor fab is being set up in Dholera, Gujarat, through a partnership between Tata Electronics and Taiwan’s Powerchip Semiconductor Manufacturing Corporation (PSMC). It represents a critical milestone in Indian industrial self-reliance.",
    subject: "Current Affairs",
    topic: "National Missions",
    subtopic: "India Semiconductor Mission",
    difficulty: "medium",
    sourceType: "current_affairs",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "CURRENT AFFAIRS - GENERAL"
  },
  {
    id: "ca-002",
    question: "Which of the following research facilities has been launched by India in the southern high-latitude waters to study Southern Ocean parameters and climate dependencies?",
    options: [
      "Maitri-II",
      "Sagar Nidhi-V",
      "Bharati Station Deep Sea Oceanography",
      "Samudra Manthan Research Hub"
    ],
    correctOptionIndex: 0,
    explanation: "India is actively expanding its polar footprint. The development of Maitri-II in Antarctica is aimed at replacing the old Maitri base, focusing extensively on Southern Ocean parameters, climate dynamics, and glacial core research.",
    subject: "Current Affairs",
    topic: "Science & Technology",
    subtopic: "Polar Research",
    difficulty: "hard",
    sourceType: "current_affairs",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "CURRENT AFFAIRS - GENERAL"
  },
  {
    id: "eoro-001",
    question: "Under Section 3 of the Rajasthan Municipality Act, 2009, which entity has the official authority to declare any local area to be a municipality or include/exclude areas from its limits?",
    options: [
      "The State Government of Rajasthan",
      "The Governor of Rajasthan",
      "The Director of Local Bodies (DLB)",
      "The Rajasthan Municipal Board President"
    ],
    correctOptionIndex: 0,
    explanation: "According to Section 3 of the Rajasthan Municipality Act, 2009, the State Government of Rajasthan, by notification in the Official Gazette, has the authority to declare any local area to be a municipality or modify its territory.",
    subject: "Municipality Act",
    topic: "Rajasthan Municipality Act 2009",
    subtopic: "Constitution of Municipalities",
    difficulty: "medium",
    sourceType: "notes",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "EO RO"
  },
  {
    id: "raspre-001",
    question: "Who among the following was the founder of the 'Guerilla Warfare' system of military strategy in Rajasthan, actively used against the Mughal forces during medieval resistance campaigns?",
    options: [
      "Rana Pratap of Mewar",
      "Rao Chandra Sen of Marwar",
      "Rana Sanga of Mewar",
      "Rao Maldeo of Jodhpur"
    ],
    correctOptionIndex: 1,
    explanation: "Rao Chandra Sen of Marwar (often called the 'Forgotten Hero of Rajasthan' or 'Pratap of Marwar') was the pioneer of guerilla warfare in the Aravali hills against Akbar, which was later adopted on a larger scale by Maharana Pratap.",
    subject: "Rajasthan GK",
    topic: "Medieval History of Rajasthan",
    subtopic: "Mughal Resistance Leaders",
    difficulty: "hard",
    sourceType: "pyq",
    timesAnswered: 0,
    timesCorrect: 0,
    targetExam: "RAS PRE"
  }
];

export const initialDocuments: SourceDocument[] = [
  {
    id: "doc-1",
    name: "Aravalli Highlands Drainage Divide.txt",
    content: "The Aravalli hills split Rajasthan diagonally from Southwest (Khedbrahma) to Northeast (Khetri). This range serves as the critical water divide (Drainage Watershed) of Western India. Rivers to the West of the Aravalli run into the arid sandy plains draining towards the Arabian Sea. Luni, Jawai, and Sukri are prime west-flowing channels in South Rajasthan. On the contrary, rivers located East of the Aravalli (Banas, Chambal, Koral, Banganga) drain towards the Bay of Bengal through the Yamuna system. The Aravallies contain important passes or 'Nals' like Desuri Nal and Someshwar Nal mediating ancient trade routes.",
    wordCount: 104,
    uploadedAt: new Date().toISOString(),
    targetExam: "RAJASTHAN GK"
  },
  {
    id: "doc-2",
    name: "NEP 2020 School Structural Pedagogy.txt",
    content: "The National Education Policy (NEP 2020) replaces the historical 10+2 system with a 5+3+3+4 framework aligned to children's cognitive growth. The Foundational stage (5 years: ages 3 to 8) covers 3 years of preschool (Anganwadi) and Grades 1 & 2. The Preparatory stage (3 years: ages 8 to 11) is from Grades 3 to 5 emphasizing play-based learning and literacy. The Middle stage (3 years: ages 11 to 14) covers Grades 6 to 8 with early introduction to coding and vocational work. Finally, the Secondary stage (4 years: ages 14 to 18) covers Grades 9 to 12 offering deep multidisciplinary options.",
    wordCount: 101,
    uploadedAt: new Date().toISOString(),
    targetExam: "DSSSB TGT"
  }
];
