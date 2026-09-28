import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import { InterviewOutcome } from '@prisma/client';

export interface InterviewQuestionItem {
  question: string;
  category?: string;
  whyWeAsk?: string;
  answer?: string;
  rating?: number;
  feedback?: string;
}

export interface AiEvaluationResult {
  overallRating: number; // 1 to 5
  percentageScore: number; // 0 to 100
  communicationLevel: string; // e.g. "Basic & Clear", "Good Conversational", "Fluent"
  strengths: string;
  concerns: string;
  outcome: InterviewOutcome; // SELECTED | ON_HOLD | REJECTED
  outcomeNote: string;
}

@Injectable()
export class InterviewAiService {
  private readonly logger = new Logger(InterviewAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates 5 practical, conversational questions in VERY EASY, PLAIN ENGLISH (Grade 4–5 vocabulary).
   * Questions test the candidate's core ability, customer service attitude, and fit for Ladakh tourism.
   */
  async generateQuestions(role: string, candidateName: string): Promise<InterviewQuestionItem[]> {
    this.logger.log(`Generating easy-English interview questions for "${candidateName}" applied for "${role}"`);

    const prompt = `You are a friendly HR interviewer for "Ladakh Vacation", a top travel company based in Leh, Ladakh.
We are interviewing a candidate named "${candidateName}" for the position of "${role}".

CRITICAL RULE:
You MUST write all 5 questions in VERY EASY, SIMPLE, CONVERSATIONAL ENGLISH (Grade 4–5 vocabulary).
Use short, simple sentences. DO NOT use fancy business words or corporate jargon.
The questions must be practical, testing real-life situations in Ladakh (such as high altitude acclimatization, snow/landslide road blocks, cold weather, caring for tourists, summer tourist rush from May to October).

Generate exactly 5 questions:
1. Warm introduction & past work experience.
2. Core daily skill for "${role}" (e.g. how they handle guests, phones, tours, vehicles, or bookings).
3. Handling a difficult situation or guest problem calmly (e.g. mountain sickness/AMS, flight delay, pass closed).
4. Teamwork and working hard during the busy Ladakh summer season (May to October).
5. Why they want to work with Ladakh Vacation and what makes them dependable.

Respond strictly in valid JSON format with NO markdown fences, like this:
{
  "questions": [
    {
      "question": "Please tell us a little about yourself and what kind of work you have done before.",
      "category": "Introduction",
      "whyWeAsk": "To see communication and confidence"
    }
  ]
}`;

    const liveResult = await this.executeAiText(prompt);
    if (liveResult) {
      try {
        const cleaned = this.cleanJsonString(liveResult);
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed?.questions) && parsed.questions.length >= 3) {
          return parsed.questions.slice(0, 5).map((q: any) => ({
            question: q.question,
            category: q.category || 'General',
            whyWeAsk: q.whyWeAsk || '',
          }));
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse AI generated questions: ${err.message}. Falling back to domain questions.`);
      }
    }

    // Built-in intelligent fallback in very easy English
    return this.getBuiltInEasyQuestions(role, candidateName);
  }

  /**
   * Provides quick, encouraging conversational feedback to the candidate's answer in very easy English,
   * making them feel comfortable and motivated for the next question.
   */
  async generateTurnFeedback(
    role: string,
    candidateName: string,
    question: string,
    answer: string,
    nextQuestion?: string,
  ): Promise<string> {
    const prompt = `You are a kind, encouraging AI interviewer for Ladakh Vacation in Leh.
Candidate Name: "${candidateName}"
Applied Role: "${role}"
Question asked: "${question}"
Candidate Answer: "${answer}"

Write a 1 or 2 sentence warm, encouraging response in VERY EASY, SIMPLE ENGLISH (Grade 3–4 vocabulary).
Acknowledge their answer positively. If there is a next question, invite them to answer it.
Do not use complicated words. Keep it friendly like a helpful friend.`;

    const liveResult = await this.executeAiText(prompt);
    if (liveResult && liveResult.trim().length > 10) {
      return liveResult.trim().replace(/^["']|["']$/g, '');
    }

    const fallbacks = [
      `Thank you ${candidateName}, that is a very clear and helpful answer!`,
      `Good response! We really like your positive attitude.`,
      `Thank you for explaining that so simply and clearly.`,
      `Great thoughts, ${candidateName}! That shows good responsibility.`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Evaluates the candidate's complete interview session across all questions & answers.
   * Produces score (1-5), percentage, communication level, strengths, concerns, and final hiring outcome.
   */
  async evaluateInterview(
    role: string,
    candidateName: string,
    questionnaire: InterviewQuestionItem[],
  ): Promise<AiEvaluationResult> {
    this.logger.log(`Evaluating interview suitability for "${candidateName}" (${role}) across ${questionnaire.length} questions`);

    const qnaText = questionnaire
      .map((q, idx) => `Q${idx + 1}: ${q.question}\nA${idx + 1}: ${q.answer || '(No answer provided)'}`)
      .join('\n\n');

    const prompt = `You are the Senior Hiring Manager and Talent Evaluator for Ladakh Vacation, a leading tour and travel operator in Leh, Ladakh.
Evaluate this candidate for the position of "${role}".

Candidate Name: "${candidateName}"
Role: "${role}"
Interview Transcript:
${qnaText}

Evaluate their suitability based on:
1. Understanding of the job role and practical travel realities in Ladakh.
2. English communication ability (is it clear, polite, easy to understand for Indian and international tourists?).
3. Customer-first empathy, helpful attitude, and calmness under pressure (such as high altitude sickness, road blocks).
4. Reliability and willingness to work hard during peak tourist season (May to October).

Return strictly a valid JSON object with NO markdown formatting:
{
  "overallRating": 4, // Integer from 1 to 5 (1=Not Suitable, 2=Below Average, 3=Average/Needs Training, 4=Good Fit, 5=Excellent Fit)
  "percentageScore": 84, // Integer from 0 to 100
  "communicationLevel": "Good Conversational", // "Basic", "Good Conversational", "Fluent & Clear", or "Excellent"
  "strengths": "• Friendly, polite, and respectful tone\\n• Understands basic customer care\\n• Ready to work during peak summer months",
  "concerns": "• Needs practical training on high altitude oxygen and company software protocols",
  "outcome": "SELECTED", // Exactly one of: "SELECTED", "ON_HOLD", "REJECTED"
  "outcomeNote": "Candidate demonstrates good practical common sense and a welcoming attitude towards guests. Recommended for hiring with 1 week of orientation on hotel & cab operations."
}`;

    const liveResult = await this.executeAiText(prompt);
    if (liveResult) {
      try {
        const cleaned = this.cleanJsonString(liveResult);
        const parsed = JSON.parse(cleaned);

        let outcome: InterviewOutcome = InterviewOutcome.ON_HOLD;
        const rawOutcome = (parsed.outcome || '').toUpperCase();
        if (rawOutcome.includes('SELECT')) outcome = InterviewOutcome.SELECTED;
        else if (rawOutcome.includes('REJECT')) outcome = InterviewOutcome.REJECTED;

        const rating = Math.min(5, Math.max(1, Math.round(Number(parsed.overallRating) || 3)));
        const score = Math.min(100, Math.max(10, Math.round(Number(parsed.percentageScore) || (rating * 20))));

        return {
          overallRating: rating,
          percentageScore: score,
          communicationLevel: parsed.communicationLevel || 'Good Conversational',
          strengths: parsed.strengths || '• Positive attitude and willing to assist guests\n• Basic understanding of travel work',
          concerns: parsed.concerns || '• Standard on-the-job training recommended',
          outcome,
          outcomeNote: parsed.outcomeNote || `Candidate demonstrated good potential for the ${role} position.`,
        };
      } catch (err: any) {
        this.logger.warn(`Failed to parse AI evaluation: ${err.message}. Using built-in evaluator.`);
      }
    }

    return this.synthesizeBuiltInEvaluation(role, candidateName, questionnaire);
  }

  // ==========================================================================
  // Session & Database Helpers
  // ==========================================================================

  /**
   * Initializes or loads the AI interview session for an interview record.
   */
  async startAiSession(interviewId: string) {
    const iv = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!iv) throw new NotFoundException('Interview not found');

    let currentQuestions = (iv.questionnaire as unknown as InterviewQuestionItem[]) ?? [];

    // If no questions exist yet, generate 5 easy English questions
    if (!Array.isArray(currentQuestions) || currentQuestions.length === 0) {
      currentQuestions = await this.generateQuestions(iv.role, iv.candidateName);
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { questionnaire: currentQuestions as any },
      });
    }

    // Determine current progress
    const answeredCount = currentQuestions.filter((q) => q.answer && q.answer.trim().length > 0).length;
    const isCompleted = answeredCount >= currentQuestions.length && currentQuestions.length > 0;

    return {
      interviewId: iv.id,
      candidateName: iv.candidateName,
      candidatePhone: iv.candidatePhone,
      role: iv.role,
      scheduledAt: iv.scheduledAt,
      durationMinutes: iv.durationMinutes,
      questions: currentQuestions,
      currentQuestionIndex: isCompleted ? currentQuestions.length : answeredCount,
      answeredCount,
      totalQuestions: currentQuestions.length,
      isCompleted,
      overallRating: iv.overallRating,
      outcome: iv.outcome,
      strengths: iv.strengths,
      concerns: iv.concerns,
      outcomeNote: iv.outcomeNote,
    };
  }

  /**
   * Records a candidate answer, generates friendly AI feedback, and progresses the session.
   * If all questions are answered, runs evaluation and persists to the database.
   */
  async submitAnswer(interviewId: string, questionIndex: number, answer: string) {
    const iv = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!iv) throw new NotFoundException('Interview not found');

    let questions = (iv.questionnaire as unknown as InterviewQuestionItem[]) ?? [];
    if (!Array.isArray(questions) || questions.length === 0) {
      questions = await this.generateQuestions(iv.role, iv.candidateName);
    }

    if (questionIndex >= 0 && questionIndex < questions.length) {
      questions[questionIndex] = {
        ...questions[questionIndex],
        answer: answer.trim(),
      };
    }

    const currentQ = questions[questionIndex];
    const nextQ = questions[questionIndex + 1];

    // Generate warm turn feedback
    const feedback = await this.generateTurnFeedback(
      iv.role,
      iv.candidateName,
      currentQ?.question || '',
      answer,
      nextQ?.question,
    );

    if (currentQ) {
      currentQ.feedback = feedback;
    }

    const answeredCount = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;
    const isCompleted = answeredCount >= questions.length;

    let evaluationResult: AiEvaluationResult | null = null;

    if (isCompleted) {
      evaluationResult = await this.evaluateInterview(iv.role, iv.candidateName, questions);
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          questionnaire: questions as any,
          overallRating: evaluationResult.overallRating,
          strengths: evaluationResult.strengths,
          concerns: evaluationResult.concerns,
          outcome: evaluationResult.outcome,
          outcomeNote: evaluationResult.outcomeNote,
        },
      });
    } else {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { questionnaire: questions as any },
      });
    }

    return {
      success: true,
      feedback,
      nextIndex: isCompleted ? null : questionIndex + 1,
      nextQuestion: nextQ ? nextQ.question : null,
      isCompleted,
      evaluation: evaluationResult,
    };
  }

  /**
   * Candidate phone verification login helper.
   * Finds the candidate's latest scheduled interview using their phone number.
   */
  async loginCandidateByPhone(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10); // match last 10 digits
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new NotFoundException('Please enter a valid mobile number.');
    }

    const candidateInterview = await this.prisma.interview.findFirst({
      where: {
        candidatePhone: {
          contains: cleanPhone,
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    if (!candidateInterview) {
      throw new NotFoundException(
        `No scheduled interview session found for mobile number ending in ${cleanPhone}. Please verify with Ladakh Vacation HR.`,
      );
    }

    return {
      interviewId: candidateInterview.id,
      candidateName: candidateInterview.candidateName,
      role: candidateInterview.role,
      scheduledAt: candidateInterview.scheduledAt,
    };
  }

  // ==========================================================================
  // Multi-Provider AI Execution Swarm
  // ==========================================================================

  private async executeAiText(prompt: string): Promise<string | null> {
    try {
      const activeAiIntegrations = await this.prisma.integration.findMany({
        where: { category: 'AI', isActive: true },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      });

      for (const integration of activeAiIntegrations) {
        try {
          const creds = JSON.parse(decryptSecret(integration.credentials));
          const apiKey = creds.apiKey;
          if (!apiKey) continue;

          let responseText: string | null = null;

          if (integration.provider === 'google_gemini') {
            responseText = await this.callGemini(apiKey, prompt, creds.model);
          } else if (integration.provider === 'groq') {
            const model = creds.model || 'llama-3.3-70b-versatile';
            responseText = await this.callOpenAiCompatible('https://api.groq.com/openai/v1', apiKey, model, prompt);
          } else if (integration.provider === 'openrouter') {
            const model = creds.model || 'meta-llama/llama-3.3-70b-instruct:free';
            responseText = await this.callOpenAiCompatible('https://openrouter.ai/api/v1', apiKey, model, prompt, {
              'HTTP-Referer': 'https://ladakhvacation.in',
              'X-Title': 'Ladakh Vacation HR AI',
            });
          } else if (integration.provider === 'mistral') {
            const model = creds.model || 'mistral-small-latest';
            responseText = await this.callOpenAiCompatible('https://api.mistral.ai/v1', apiKey, model, prompt);
          } else if (integration.provider === 'deepseek') {
            responseText = await this.callOpenAiCompatible('https://api.deepseek.com', apiKey, 'deepseek-chat', prompt);
          } else if (integration.provider === 'nvidia') {
            const model = creds.model || 'meta/llama-3.3-70b-instruct';
            responseText = await this.callOpenAiCompatible('https://integrate.api.nvidia.com/v1', apiKey, model, prompt);
          } else if (integration.provider === 'cerebras') {
            const model = creds.model || 'llama3.3-70b';
            responseText = await this.callOpenAiCompatible('https://api.cerebras.ai/v1', apiKey, model, prompt);
          } else if (integration.provider === 'sambanova') {
            const model = creds.model || 'Meta-Llama-3.3-70B-Instruct';
            responseText = await this.callOpenAiCompatible('https://api.sambanova.ai/v1', apiKey, model, prompt);
          } else if (integration.provider === 'openai') {
            responseText = await this.callOpenAi(apiKey, prompt);
          } else if (integration.provider === 'anthropic') {
            responseText = await this.callAnthropic(apiKey, prompt);
          }

          if (responseText && responseText.trim().length > 0) {
            this.logger.log(`AI completion delivered via provider "${integration.provider}"`);
            return responseText.trim();
          }
        } catch (provErr: any) {
          this.logger.warn(`Provider ${integration.provider} failed: ${provErr.message}. Failing over to next AI provider.`);
        }
      }
    } catch (swarmErr: any) {
      this.logger.warn(`AI swarm error: ${swarmErr.message}`);
    }

    return null;
  }

  private async callGemini(apiKey: string, prompt: string, customModel?: string): Promise<string | null> {
    const model = customModel || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok && model !== 'gemini-1.5-flash') {
      const fallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      res = await fetch(fallback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      });
    }

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  private async callOpenAiCompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<string | null> {
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`${baseUrl} HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  }

  private async callOpenAi(apiKey: string, prompt: string): Promise<string | null> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  }

  private async callAnthropic(apiKey: string, prompt: string): Promise<string | null> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const data = await res.json();
    return data?.content?.[0]?.text ?? null;
  }

  // ==========================================================================
  // Built-in Domain Knowledge & Fallback Rules
  // ==========================================================================

  private getBuiltInEasyQuestions(role: string, candidateName: string): InterviewQuestionItem[] {
    const r = role.toLowerCase();

    if (r.includes('sale') || r.includes('travel') || r.includes('executive')) {
      return [
        {
          question: `Hello ${candidateName}! Please introduce yourself and tell us what kind of work experience you have.`,
          category: 'Introduction',
        },
        {
          question: 'A tourist calls and asks for a 5-day trip to Leh, Nubra Valley, and Pangong Lake. How do you explain the itinerary in very simple words?',
          category: 'Sales & Tour Knowledge',
        },
        {
          question: 'If a customer says another travel agency is offering the package for cheaper, what do you tell them politely?',
          category: 'Handling Objections',
        },
        {
          question: 'In Ladakh, peak tourist season from May to October is very busy with many guest inquiries. How do you manage your time and answer promptly?',
          category: 'Time Management',
        },
        {
          question: 'Why do you want to work with Ladakh Vacation, and what makes you good at speaking with customers?',
          category: 'Motivation & Fit',
        },
      ];
    }

    if (r.includes('operation') || r.includes('coordinator')) {
      return [
        {
          question: `Hello ${candidateName}! Please tell us a little about yourself and your previous jobs.`,
          category: 'Introduction',
        },
        {
          question: 'If Khardung La or Chang La pass gets blocked because of sudden snowfall, what steps do you take for the guests in our vehicles?',
          category: 'Emergency Handling',
        },
        {
          question: 'If a guest in Leh feels sick, dizzy, and has a bad headache due to high altitude (mountain sickness), how do you help them immediately?',
          category: 'Guest Health & Safety',
        },
        {
          question: 'If a hotel room is not ready or a driver arrives late in the morning, how do you fix the issue calmly?',
          category: 'Vendor & Hotel Coordination',
        },
        {
          question: 'Why are you interested in this operations job in Leh, and how do you stay calm when things go wrong?',
          category: 'Reliability & Fit',
        },
      ];
    }

    if (r.includes('driver') || r.includes('transport')) {
      return [
        {
          question: `Hello ${candidateName}! How many years have you been driving in Ladakh, and which mountain passes do you know best?`,
          category: 'Driving Experience',
        },
        {
          question: 'Before starting a long drive to Nubra Valley or Pangong Lake, what important things do you check in your vehicle?',
          category: 'Vehicle Safety Check',
        },
        {
          question: 'If it starts snowing heavily on the road and the tyres begin to slip, how do you drive safely?',
          category: 'Mountain Driving Safety',
        },
        {
          question: 'If a tourist asks you to drive very fast because they are in a hurry, what will you tell them politely?',
          category: 'Guest Handling & Speed Rules',
        },
        {
          question: 'Why do you want to drive tourists for Ladakh Vacation, and how do you make sure guests feel comfortable in your car?',
          category: 'Customer Courtesy',
        },
      ];
    }

    if (r.includes('guide') || r.includes('leader')) {
      return [
        {
          question: `Hello ${candidateName}! Please introduce yourself and tell us which languages you speak comfortably.`,
          category: 'Introduction & Languages',
        },
        {
          question: 'When you take a group of tourists to Thiksey Monastery or Leh Palace, how do you explain the history simply and make it enjoyable?',
          category: 'Storytelling & Sightseeing',
        },
        {
          question: 'If someone in your tour group is walking slowly and feeling breathless from high altitude, how do you care for them?',
          category: 'Tourist Care & Altitude Safety',
        },
        {
          question: 'How do you make sure tourists respect local Ladakhi culture and do not throw plastic or trash in nature?',
          category: 'Eco-Tourism & Culture',
        },
        {
          question: 'What do you love most about showing Ladakh to visitors, and why should we choose you as our Tour Leader?',
          category: 'Passion & Leadership',
        },
      ];
    }

    // Default general role
    return [
      {
        question: `Hello ${candidateName}! Please introduce yourself and share a little about your background and past work.`,
        category: 'Introduction',
      },
      {
        question: `What do you think are the most important daily responsibilities for a ${role} at Ladakh Vacation?`,
        category: 'Job Understanding',
      },
      {
        question: 'Can you tell us about a time when you faced a difficult problem at work or with a customer, and how you solved it?',
        category: 'Problem Solving',
      },
      {
        question: 'During Ladakh summer tourist season from May to October, work is very active and fast. Are you ready for busy days and teamwork?',
        category: 'Dedication & Teamwork',
      },
      {
        question: 'Why do you feel this job is the right choice for you, and what are your greatest strengths?',
        category: 'Strengths & Motivation',
      },
    ];
  }

  private synthesizeBuiltInEvaluation(
    role: string,
    candidateName: string,
    questionnaire: InterviewQuestionItem[],
  ): AiEvaluationResult {
    let answeredCount = 0;
    let totalLength = 0;

    for (const q of questionnaire) {
      if (q.answer && q.answer.trim().length > 10) {
        answeredCount++;
        totalLength += q.answer.trim().length;
      }
    }

    const avgLength = answeredCount > 0 ? totalLength / answeredCount : 0;

    let rating = 3;
    let percentage = 70;
    let commLevel = 'Good Conversational';
    let outcome: InterviewOutcome = InterviewOutcome.ON_HOLD;

    if (answeredCount >= 4 && avgLength > 50) {
      rating = 4;
      percentage = 82;
      commLevel = 'Fluent & Clear';
      outcome = InterviewOutcome.SELECTED;
    } else if (answeredCount >= 5 && avgLength > 100) {
      rating = 5;
      percentage = 92;
      commLevel = 'Exceptional';
      outcome = InterviewOutcome.SELECTED;
    } else if (answeredCount <= 2) {
      rating = 2;
      percentage = 48;
      commLevel = 'Basic';
      outcome = InterviewOutcome.REJECTED;
    }

    return {
      overallRating: rating,
      percentageScore: percentage,
      communicationLevel: commLevel,
      strengths: `• Clearly answered ${answeredCount} of ${questionnaire.length} interview questions\n• Polite and respectful conversational tone\n• Eager to support Ladakh Vacation operations`,
      concerns: answeredCount < 4 ? '• Several questions were left brief or unanswered\n• Needs deeper role orientation' : '• Routine training on high altitude SOPs and CRM tools',
      outcome,
      outcomeNote: `Candidate ${candidateName} shows solid promise for ${role}. Overall score ${percentage}%. Recommended for ${outcome.toLowerCase().replace('_', ' ')}.`,
    };
  }

  private cleanJsonString(raw: string): string {
    return raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }
}
