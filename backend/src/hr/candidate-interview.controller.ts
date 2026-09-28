import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { InterviewAiService } from './interview-ai.service';

@Public()
@Controller('interviews/candidate')
export class CandidateInterviewController {
  constructor(private readonly aiService: InterviewAiService) {}

  /**
   * Candidate login by mobile phone number.
   * Finds the latest interview scheduled for this phone number.
   */
  @Post('login')
  login(@Body() body: { phone: string }) {
    return this.aiService.loginCandidateByPhone(body.phone);
  }

  /**
   * Candidate retrieves interview session details and existing progress.
   */
  @Get(':id/session')
  getSession(@Param('id') id: string) {
    return this.aiService.startAiSession(id);
  }

  /**
   * Candidate starts or generates the 5 easy-English questions for their role.
   */
  @Post(':id/start')
  startSession(@Param('id') id: string) {
    return this.aiService.startAiSession(id);
  }

  /**
   * Candidate submits their answer for question #questionIndex.
   * Returns warm turn feedback and the next question, or triggers evaluation if finished.
   */
  @Post(':id/answer')
  submitAnswer(
    @Param('id') id: string,
    @Body() body: { questionIndex: number; answer: string },
  ) {
    return this.aiService.submitAnswer(id, body.questionIndex, body.answer);
  }
}
