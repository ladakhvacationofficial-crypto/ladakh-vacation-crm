'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Mountain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  MessageSquare,
  Award,
  RefreshCw,
  Clock,
  Briefcase,
} from 'lucide-react';
import { api, ApiError, type InterviewAiSession, type InterviewQuestionItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/select';

export default function CandidateInterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [session, setSession] = useState<InterviewAiSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active question index and answer
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Voice Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Audio Text-to-Speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Load session
  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<InterviewAiSession>(`/interviews/candidate/${id}/session`);
      setSession(data);
      if (data.isCompleted) {
        setIsCompleted(true);
      } else {
        // Find first unanswered question
        const firstUnanswered = data.questions.findIndex(
          (q) => !q.answer || q.answer.trim().length === 0,
        );
        const targetIdx = firstUnanswered !== -1 ? firstUnanswered : 0;
        setCurrentIdx(targetIdx);
        setAnswerText(data.questions[targetIdx]?.answer || '');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load interview session. Please check your interview link.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Speech-to-Text handler
  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech-to-text is not supported by your current browser. You can type your answer.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English accent recognition

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setAnswerText(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Could not start speech recognition:', e);
      setIsListening(false);
    }
  }

  // Text-to-Speech handler
  function speakQuestion(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel(); // cancel any active speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95; // gentle, clear pace for easy understanding
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  }

  // Submit Answer
  async function handleSubmitAnswer() {
    if (!answerText.trim() || submitting || !session) return;

    // Stop microphone if still listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    // Stop audio if speaking
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post<{
        success: boolean;
        feedback: string;
        nextIndex: number | null;
        nextQuestion: string | null;
        isCompleted: boolean;
      }>(`/interviews/candidate/${id}/answer`, {
        questionIndex: currentIdx,
        answer: answerText.trim(),
      });

      setLastFeedback(res.feedback);

      // Update local session questions
      const updatedQuestions = [...session.questions];
      if (updatedQuestions[currentIdx]) {
        updatedQuestions[currentIdx] = {
          ...updatedQuestions[currentIdx],
          answer: answerText.trim(),
          feedback: res.feedback,
        };
      }

      setSession({
        ...session,
        questions: updatedQuestions,
        answeredCount: updatedQuestions.filter((q) => q.answer).length,
      });

      if (res.isCompleted || res.nextIndex === null) {
        setIsCompleted(true);
      } else {
        // Advance to next question after small breath so candidate reads feedback
        const nextIdx = res.nextIndex;
        setCurrentIdx(nextIdx);
        setAnswerText(updatedQuestions[nextIdx]?.answer || '');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not submit your answer. Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-ink-100">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400 animate-pulse">
          <Mountain className="size-7" strokeWidth={1.75} />
        </div>
        <p className="mt-4 text-sm font-medium text-ink-400">Loading your AI Interview session...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-ink-100">
        <div className="w-full max-w-md rounded-2xl border border-loss-500/30 bg-ink-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <AlertCircle className="mx-auto size-12 text-loss-400" />
          <h2 className="mt-4 text-xl font-bold text-ink-50">Interview Session Unavailable</h2>
          <p className="mt-2 text-sm text-ink-400">{error}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => loadSession()}
              className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold"
            >
              <RefreshCw className="mr-2 size-4" /> Try Again
            </Button>
            <Link href="/interview/login">
              <Button variant="ghost" className="w-full text-ink-400 hover:text-ink-100">
                Go to Candidate Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const currentQ: InterviewQuestionItem | undefined = session.questions[currentIdx];
  const progressPercent = Math.round(
    ((session.questions.filter((q) => q.answer).length) / session.questions.length) * 100,
  );

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col justify-between">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[520px] w-[520px] rounded-full bg-gold-500/5 blur-[140px]" />
      </div>

      {/* Top Header */}
      <header className="relative border-b border-ink-800/80 bg-ink-900/60 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400">
              <Mountain className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-ink-50">
                  Ladakh Vacation
                </span>
                <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-400 uppercase tracking-wider">
                  AI Interview
                </span>
              </div>
              <p className="text-[11.5px] text-ink-400">
                Candidate: <strong className="text-ink-200">{session.candidateName}</strong> · Applied for <strong className="text-gold-400">{session.role}</strong>
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-ink-300">
              Question {Math.min(currentIdx + 1, session.questions.length)} of {session.questions.length}
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full bg-gold-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          {/* Mobile Progress Bar */}
          <div className="sm:hidden mb-4">
            <div className="flex justify-between text-xs text-ink-400 mb-1">
              <span>Progress</span>
              <span>
                {Math.min(currentIdx + 1, session.questions.length)} of {session.questions.length} ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full bg-gold-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* COMPLETED STATE */}
          {isCompleted ? (
            <div className="rounded-2xl border border-gold-500/30 bg-ink-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md text-center">
              <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-lg shadow-gold-500/10">
                <Award className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
                Interview Completed! 🎉
              </h2>
              <p className="mt-2 text-sm text-ink-300 max-w-md mx-auto">
                Thank you so much, <strong className="text-gold-400">{session.candidateName}</strong>! All your answers have been submitted directly to Ladakh Vacation HR.
              </p>

              <div className="mt-6 rounded-xl border border-ink-800 bg-ink-950/70 p-4 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-400 mb-2">
                  <CheckCircle2 className="size-4" /> Next Steps
                </div>
                <p className="text-xs text-ink-400 leading-relaxed">
                  Our recruitment team in Leh will review your interview transcript and answers. If your profile matches our requirements, we will reach out to you via WhatsApp or phone at <strong className="text-ink-200">{session.candidatePhone}</strong>.
                </p>
              </div>

              {/* Summary of Questions */}
              <div className="mt-8 text-left border-t border-ink-800 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
                  Summary of your responses:
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {session.questions.map((q, idx) => (
                    <div key={idx} className="rounded-lg border border-ink-800/80 bg-ink-950/40 p-3">
                      <div className="text-xs font-medium text-ink-300">
                        {idx + 1}. {q.question}
                      </div>
                      <p className="mt-1 text-xs text-ink-400 italic">
                        &quot;{q.answer || 'No answer recorded'}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Link href="/interview/login">
                  <Button variant="secondary" className="border-ink-700 text-ink-300 hover:text-ink-100">
                    Close Session
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* ACTIVE QUESTION VIEW */
            <div className="space-y-6">
              {/* Question Card */}
              <div className="rounded-2xl border border-ink-800 bg-ink-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-gold-500/10 border border-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                    Question {currentIdx + 1} of {session.questions.length}
                    {currentQ?.category ? ` · ${currentQ.category}` : ''}
                  </span>

                  {/* Audio Listen Button */}
                  {currentQ && (
                    <button
                      type="button"
                      onClick={() => speakQuestion(currentQ.question)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isPlayingAudio
                          ? 'bg-gold-500 text-ink-950 font-semibold animate-pulse'
                          : 'bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100'
                      }`}
                      title="Listen to this question spoken aloud"
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="size-3.5" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3.5" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Question Text in Easy English */}
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-50 sm:text-xl leading-relaxed">
                  {currentQ?.question}
                </h2>

                <p className="mt-2 text-xs text-ink-400 flex items-center gap-1.5">
                  <HelpCircle className="size-3.5 text-gold-400 shrink-0" />
                  <span>Answer in simple, easy English. Take your time!</span>
                </p>
              </div>

              {/* Encouraging Turn Feedback if coming from previous answer */}
              {lastFeedback && (
                <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-xs text-gold-200 flex items-start gap-2.5 animate-fadeIn">
                  <Sparkles className="size-4 shrink-0 text-gold-400 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gold-300">AI Note: </span>
                    {lastFeedback}
                  </div>
                </div>
              )}

              {/* Answer Input Card */}
              <div className="rounded-2xl border border-ink-800 bg-ink-900/90 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="answer" className="text-xs font-medium text-ink-300">
                    Your Answer:
                  </label>

                  {/* Voice Microphone Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isListening
                          ? 'bg-loss-500 text-white animate-pulse shadow-lg shadow-loss-500/30'
                          : 'bg-gold-500/15 text-gold-400 hover:bg-gold-500/25 border border-gold-500/30'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="size-3.5" />
                          <span>Listening... (Click to stop)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="size-3.5" />
                          <span>Speak Answer 🎙️</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    id="answer"
                    rows={4}
                    disabled={submitting}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer here, or click 'Speak Answer' to speak using your microphone..."
                    className="w-full rounded-xl border border-ink-700/80 bg-ink-950/80 p-3.5 text-sm text-ink-100 placeholder:text-ink-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                  />
                  {isListening && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-loss-500/20 px-2 py-1 text-[11px] font-medium text-loss-400">
                      <span className="size-2 rounded-full bg-loss-500 animate-ping" />
                      Recording your voice...
                    </div>
                  )}
                </div>

                {error && (
                  <p className="rounded-lg border border-loss-500/30 bg-loss-500/10 p-2.5 text-xs text-loss-400">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11.5px] text-ink-500">
                    {answerText.trim().split(/\s+/).filter(Boolean).length} words
                  </div>

                  <div className="flex items-center gap-2">
                    {answerText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => setAnswerText('')}
                        className="text-xs text-ink-400 hover:text-ink-200"
                      >
                        Clear
                      </Button>
                    )}

                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={submitting || !answerText.trim()}
                      className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold shadow-lg shadow-gold-500/20 h-10 px-5"
                    >
                      {submitting ? (
                        'Analyzing response...'
                      ) : currentIdx === session.questions.length - 1 ? (
                        <>
                          Submit & Finish Interview
                          <CheckCircle2 className="ml-2 size-4" />
                        </>
                      ) : (
                        <>
                          Next Question
                          <ArrowRight className="ml-2 size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-ink-800/80 bg-ink-900/40 px-4 py-3 text-center text-xs text-ink-500">
        Ladakh Vacation Travel Pvt Ltd · AI Candidate Portal · Very Easy English Mode
      </footer>
    </div>
  );
}
