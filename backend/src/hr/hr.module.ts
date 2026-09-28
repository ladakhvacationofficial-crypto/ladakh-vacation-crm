import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { InterviewAiService } from './interview-ai.service';
import { CandidateInterviewController } from './candidate-interview.controller';

@Module({
  providers: [HrService, InterviewAiService],
  controllers: [HrController, CandidateInterviewController],
  exports: [HrService, InterviewAiService],
})
export class HrModule {}
