import * as React from 'react';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { renderToBuffer } from '@react-pdf/renderer';
import { Role } from '@prisma/client';
import { HrService } from './hr.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { GenerateSlipDto } from './dto/generate-slip.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { SalarySlipDocument } from './templates/salary-slip';
import { InterviewSheetDocument } from './templates/interview-sheet';
import { InterviewAiService } from './interview-ai.service';

/**
 * HR data is sensitive by default — salary components, home address,
 * emergency contacts. The whole module is gated on OWNER + SUPER_ADMIN. If
 * the team grows and a dedicated HR role is needed, add HR_MANAGER to the
 * Role enum and update this list.
 */
const HR_ROLES: Role[] = [Role.SUPER_ADMIN, Role.OWNER];

@Roles(...HR_ROLES)
@Controller()
export class HrController {
  constructor(
    private readonly hr: HrService,
    private readonly aiService: InterviewAiService,
  ) {}

  // ---- Employees ---------------------------------------------------------

  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hr.createEmployee(dto);
  }

  @Get('employees')
  listEmployees(
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.hr.listEmployees({ status, department, search });
  }

  @Get('employees/:id')
  findEmployee(@Param('id') id: string) {
    return this.hr.findEmployee(id);
  }

  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hr.updateEmployee(id, dto);
  }

  /**
   * Soft-exit an employee — flip status to EXITED and stamp exitedOn=today.
   * The row survives so salary slips, interview history and org-chart
   * relations stay intact.
   */
  @Delete('employees/:id')
  deactivateEmployee(@Param('id') id: string) {
    return this.hr.deactivateEmployee(id);
  }

  @Get('employees/:id/performance')
  performance(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hr.performance(id, { from, to });
  }

  // ---- Salary slips ------------------------------------------------------

  @Post('employees/:id/salary-slips')
  generateSlip(@Param('id') id: string, @Body() dto: GenerateSlipDto) {
    return this.hr.generateSlip(id, dto);
  }

  @Get('salary-slips/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadSlip(@Param('id') id: string, @Res() res: Response) {
    const s = await this.hr.findSlip(id);
    const buf = await renderToBuffer(
      React.createElement(SalarySlipDocument, {
        employee: s.employee,
        slip: {
          periodMonth: s.periodMonth,
          daysWorked: s.daysWorked,
          daysInMonth: s.daysInMonth,
          lop: s.lop,
          basic: s.basic,
          hra: s.hra,
          allowances: s.allowances,
          bonus: s.bonus,
          arrears: s.arrears,
          pf: s.pf,
          esi: s.esi,
          tax: s.tax,
          otherDed: s.otherDed,
          grossPay: s.grossPay,
          totalDed: s.totalDed,
          netPay: s.netPay,
          paidOn: s.paidOn,
          reference: s.reference,
        },
      }) as any,
    );
    const month = new Date(s.periodMonth)
      .toISOString()
      .slice(0, 7);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="SalarySlip-${s.employee.code}-${month}.pdf"`,
    );
    res.send(buf);
  }

  // ---- Interviews --------------------------------------------------------

  @Post('interviews')
  createInterview(@Body() dto: CreateInterviewDto) {
    return this.hr.createInterview(dto);
  }

  @Get('interviews')
  listInterviews(
    @Query('outcome') outcome?: string,
    @Query('search') search?: string,
  ) {
    return this.hr.listInterviews({ outcome, search });
  }

  @Get('interviews/:id')
  findInterview(@Param('id') id: string) {
    return this.hr.findInterview(id);
  }

  @Patch('interviews/:id')
  updateInterview(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.hr.updateInterview(id, dto);
  }

  /** Hard-delete — interviews have no downstream financial relations. */
  @Delete('interviews/:id')
  removeInterview(@Param('id') id: string) {
    return this.hr.removeInterview(id);
  }

  @Get('interviews/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadInterview(@Param('id') id: string, @Res() res: Response) {
    const iv = await this.hr.findInterview(id);
    const buf = await renderToBuffer(
      React.createElement(InterviewSheetDocument, {
        interview: {
          candidateName: iv.candidateName,
          candidatePhone: iv.candidatePhone,
          candidateEmail: iv.candidateEmail,
          role: iv.role,
          scheduledAt: iv.scheduledAt,
          durationMinutes: iv.durationMinutes,
          interviewerName: iv.interviewerName,
          interviewer: iv.interviewer,
          questionnaire: (iv.questionnaire as any) ?? [],
          overallRating: iv.overallRating,
          strengths: iv.strengths,
          concerns: iv.concerns,
          outcome: iv.outcome,
          outcomeNote: iv.outcomeNote,
        },
      }) as any,
    );
    const slug = iv.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Interview-${slug}.pdf"`,
    );
    res.send(buf);
  }

  // ---- AI Interview Live Session & Evaluation -----------------------------

  @Post('interviews/:id/ai/start')
  startAiInterview(@Param('id') id: string) {
    return this.aiService.startAiSession(id);
  }

  @Post('interviews/:id/ai/answer')
  submitAiAnswer(
    @Param('id') id: string,
    @Body() body: { questionIndex: number; answer: string },
  ) {
    return this.aiService.submitAnswer(id, body.questionIndex, body.answer);
  }

  @Post('interviews/:id/ai/evaluate')
  async evaluateInterview(@Param('id') id: string) {
    const iv = await this.hr.findInterview(id);
    const questions = (iv.questionnaire as any) ?? [];
    const evaluation = await this.aiService.evaluateInterview(iv.role, iv.candidateName, questions);
    return this.hr.updateInterview(id, {
      overallRating: evaluation.overallRating,
      strengths: evaluation.strengths,
      concerns: evaluation.concerns,
      outcome: evaluation.outcome,
      outcomeNote: evaluation.outcomeNote,
    } as any);
  }

  @Post('interviews/:id/ai/reset')
  async resetAiInterview(@Param('id') id: string) {
    const iv = await this.hr.findInterview(id);
    const freshQuestions = await this.aiService.generateQuestions(iv.role, iv.candidateName);
    return this.hr.updateInterview(id, {
      questionnaire: freshQuestions as any,
      overallRating: null,
      strengths: null,
      concerns: null,
      outcome: 'PENDING' as any,
      outcomeNote: null,
    } as any);
  }
}

