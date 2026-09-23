import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { GenerateSlipDto } from './dto/generate-slip.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { toDateOrNull } from '../common/dates';
import { withNumberRetry } from '../common/sequence';
import {
  computeSlip,
  daysInMonth,
  prorate,
  SalaryComponents,
} from './salary-math';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Employees
  // ==========================================================================

  /** LV-EMP-2026-0001 style, sequential per year. */
  private async nextEmployeeCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LV-EMP-${year}-`;
    const last = await this.prisma.employee.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(n).padStart(4, '0')}`;
  }

  async createEmployee(dto: CreateEmployeeDto) {
    return withNumberRetry(() => this.createEmployeeOnce(dto));
  }

  private async createEmployeeOnce(dto: CreateEmployeeDto) {
    const data: Prisma.EmployeeCreateInput = {
      code: await this.nextEmployeeCode(),
      fullName: dto.fullName,
      phone: dto.phone,
      designation: dto.designation,
      joinedOn: new Date(dto.joinedOn),
      // pass through every optional field (nullable date helpers where relevant)
      fatherName: dto.fatherName ?? null,
      photoUrl: dto.photoUrl ?? null,
      bloodGroup: dto.bloodGroup ?? null,
      dob: toDateOrNull(dto.dob),
      gender: dto.gender ?? null,
      nationality: dto.nationality ?? 'Indian',
      altPhone: dto.altPhone ?? null,
      email: dto.email ?? null,
      addressLine: dto.addressLine ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      pincode: dto.pincode ?? null,
      emergencyContactName: dto.emergencyContactName ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? null,
      emergencyContactRelation: dto.emergencyContactRelation ?? null,
      aadhaar: dto.aadhaar ?? null,
      pan: dto.pan ?? null,
      department: dto.department ?? null,
      employmentType: dto.employmentType ?? 'FULL_TIME',
      status: dto.status ?? 'ACTIVE',
      confirmedOn: toDateOrNull(dto.confirmedOn),
      ...(dto.reportsToId
        ? { reportsTo: { connect: { id: dto.reportsToId } } }
        : {}),
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      ctcMonthly: dto.ctcMonthly ?? null,
      basicMonthly: dto.basicMonthly ?? null,
      hraMonthly: dto.hraMonthly ?? null,
      allowMonthly: dto.allowMonthly ?? null,
      pfMonthly: dto.pfMonthly ?? null,
      esiMonthly: dto.esiMonthly ?? null,
      taxMonthly: dto.taxMonthly ?? null,
      otherDedMonthly: dto.otherDedMonthly ?? null,
      bankName: dto.bankName ?? null,
      accountNumber: dto.accountNumber ?? null,
      ifsc: dto.ifsc ?? null,
      notes: dto.notes ?? null,
    };
    return this.prisma.employee.create({ data });
  }

  async listEmployees(params: {
    status?: string;
    department?: string;
    search?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.department) where.department = params.department;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { designation: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      include: {
        reportsTo: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  async findEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        reportsTo: { select: { id: true, fullName: true, code: true } },
        reports: {
          select: { id: true, fullName: true, code: true, designation: true, status: true },
        },
        user: { select: { id: true, email: true, role: true } },
        salarySlips: {
          orderBy: { periodMonth: 'desc' },
          take: 12,
        },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const exists = await this.prisma.employee.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Employee not found');

    // Build the update patch — reportsToId / userId need connect/disconnect,
    // dates need the null-safe helper.
    const data: Prisma.EmployeeUpdateInput = {};
    const plainKeys: (keyof UpdateEmployeeDto)[] = [
      'fullName', 'fatherName', 'photoUrl', 'bloodGroup', 'gender',
      'nationality', 'phone', 'altPhone', 'email', 'addressLine', 'city',
      'state', 'pincode', 'emergencyContactName', 'emergencyContactPhone',
      'emergencyContactRelation', 'aadhaar', 'pan', 'designation', 'department',
      'employmentType', 'status',
      'ctcMonthly', 'basicMonthly', 'hraMonthly', 'allowMonthly', 'pfMonthly',
      'esiMonthly', 'taxMonthly', 'otherDedMonthly',
      'bankName', 'accountNumber', 'ifsc', 'notes',
    ];
    for (const k of plainKeys) if (dto[k] !== undefined) (data as any)[k] = dto[k];
    if (dto.dob !== undefined) data.dob = toDateOrNull(dto.dob);
    if (dto.joinedOn !== undefined) data.joinedOn = new Date(dto.joinedOn);
    if (dto.confirmedOn !== undefined) data.confirmedOn = toDateOrNull(dto.confirmedOn);
    if (dto.reportsToId !== undefined) {
      data.reportsTo = dto.reportsToId
        ? { connect: { id: dto.reportsToId } }
        : { disconnect: true };
    }
    if (dto.userId !== undefined) {
      data.user = dto.userId ? { connect: { id: dto.userId } } : { disconnect: true };
    }

    return this.prisma.employee.update({ where: { id }, data });
  }

  /**
   * Soft-exit — flip status to EXITED and stamp exitedOn=today. The row
   * survives so salary slips, org-chart reports, and interview history
   * remain intact. Idempotent.
   */
  async deactivateEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Employee not found');
    if (emp.status === EmploymentStatus.EXITED) {
      return { id, alreadyExited: true };
    }
    await this.prisma.employee.update({
      where: { id },
      data: {
        status: EmploymentStatus.EXITED,
        exitedOn: emp.exitedOn ?? new Date(),
      },
    });
    return { id, exited: true };
  }

  // ==========================================================================
  // Salary slips
  // ==========================================================================

  /**
   * Generate a salary slip for a month. Component overrides in the DTO win
   * over the employee's default structure; anything not overridden falls back
   * to the Employee row's monthly components; anything still missing is 0.
   * The result is FROZEN — subsequent HR raises don't retro-touch it.
   */
  async generateSlip(employeeId: string, dto: GenerateSlipDto) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const periodMonth = new Date(dto.periodMonth);
    // Normalise to first day 00:00 UTC of the period so the unique
    // (employeeId, periodMonth) index bites regardless of the day passed in.
    periodMonth.setUTCDate(1);
    periodMonth.setUTCHours(0, 0, 0, 0);

    const dim = daysInMonth(periodMonth);
    const worked = dto.daysWorked ?? dim - (dto.lop ?? 0);

    // Fall back through DTO → Employee → 0
    const pick = (dtoVal: number | undefined, empVal: number | null): number => {
      if (dtoVal !== undefined) return dtoVal;
      if (empVal !== null && empVal !== undefined) return prorate(empVal, worked, dim);
      return 0;
    };

    const comp: SalaryComponents = {
      basic: pick(dto.basic, emp.basicMonthly),
      hra: pick(dto.hra, emp.hraMonthly),
      allowances: pick(dto.allowances, emp.allowMonthly),
      bonus: dto.bonus ?? 0,
      arrears: dto.arrears ?? 0,
      pf: pick(dto.pf, emp.pfMonthly),
      esi: pick(dto.esi, emp.esiMonthly),
      tax: pick(dto.tax, emp.taxMonthly),
      otherDed: pick(dto.otherDed, emp.otherDedMonthly),
    };
    const totals = computeSlip(comp);

    return this.prisma.salarySlip.upsert({
      where: {
        employeeId_periodMonth: { employeeId, periodMonth },
      },
      create: {
        employeeId,
        periodMonth,
        daysWorked: worked,
        daysInMonth: dim,
        lop: dto.lop ?? null,
        ...comp,
        ...totals,
        paidOn: toDateOrNull(dto.paidOn),
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        daysWorked: worked,
        daysInMonth: dim,
        lop: dto.lop ?? null,
        ...comp,
        ...totals,
        paidOn: toDateOrNull(dto.paidOn),
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async findSlip(id: string) {
    const s = await this.prisma.salarySlip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            code: true, fullName: true, designation: true, department: true,
            joinedOn: true, bankName: true, accountNumber: true, pan: true,
          },
        },
      },
    });
    if (!s) throw new NotFoundException('Salary slip not found');
    return s;
  }

  // ==========================================================================
  // Interviews
  // ==========================================================================

  async createInterview(dto: CreateInterviewDto) {
    return this.prisma.interview.create({
      data: {
        candidateName: dto.candidateName,
        candidatePhone: dto.candidatePhone,
        candidateEmail: dto.candidateEmail ?? null,
        role: dto.role,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 45,
        ...(dto.interviewerId
          ? { interviewer: { connect: { id: dto.interviewerId } } }
          : {}),
        interviewerName: dto.interviewerName ?? null,
        questionnaire: (dto.questionnaire ?? []) as any,
        overallRating: dto.overallRating ?? null,
        strengths: dto.strengths ?? null,
        concerns: dto.concerns ?? null,
        outcome: dto.outcome ?? 'PENDING',
        outcomeNote: dto.outcomeNote ?? null,
      },
    });
  }

  listInterviews(params: { outcome?: string; search?: string }) {
    const where: Prisma.InterviewWhereInput = {};
    if (params.outcome) where.outcome = params.outcome as any;
    if (params.search) {
      where.OR = [
        { candidateName: { contains: params.search, mode: 'insensitive' } },
        { role: { contains: params.search, mode: 'insensitive' } },
        { candidatePhone: { contains: params.search } },
      ];
    }
    return this.prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        interviewer: { select: { id: true, fullName: true } },
      },
    });
  }

  async findInterview(id: string) {
    const iv = await this.prisma.interview.findUnique({
      where: { id },
      include: { interviewer: { select: { id: true, fullName: true } } },
    });
    if (!iv) throw new NotFoundException('Interview not found');
    return iv;
  }

  async updateInterview(id: string, dto: UpdateInterviewDto) {
    const exists = await this.prisma.interview.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Interview not found');

    const data: Prisma.InterviewUpdateInput = {};
    if (dto.candidateName !== undefined) data.candidateName = dto.candidateName;
    if (dto.candidatePhone !== undefined) data.candidatePhone = dto.candidatePhone;
    if (dto.candidateEmail !== undefined) data.candidateEmail = dto.candidateEmail;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.interviewerName !== undefined) data.interviewerName = dto.interviewerName;
    if (dto.interviewerId !== undefined) {
      data.interviewer = dto.interviewerId
        ? { connect: { id: dto.interviewerId } }
        : { disconnect: true };
    }
    if (dto.questionnaire !== undefined) data.questionnaire = dto.questionnaire as any;
    if (dto.overallRating !== undefined) data.overallRating = dto.overallRating;
    if (dto.strengths !== undefined) data.strengths = dto.strengths;
    if (dto.concerns !== undefined) data.concerns = dto.concerns;
    if (dto.outcome !== undefined) data.outcome = dto.outcome;
    if (dto.outcomeNote !== undefined) data.outcomeNote = dto.outcomeNote;

    return this.prisma.interview.update({ where: { id }, data });
  }

  /** Hard-delete — interviews have no downstream financial relations. */
  async removeInterview(id: string) {
    const exists = await this.prisma.interview.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Interview not found');
    await this.prisma.interview.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ==========================================================================
  // Performance rollup for an employee
  // ==========================================================================

  /**
   * Sales performance for an employee. Requires the employee to have a linked
   * `userId` — otherwise there's no way to attribute leads/quotes/bookings.
   * Uses date-scoped queries so the same endpoint powers "this month" and
   * "since joining" without a separate route each.
   */
  async performance(employeeId: string, params: { from?: string; to?: string }) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true, joinedOn: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    if (!emp.userId) {
      return {
        linked: false,
        message: 'This employee has no CRM login — no sales activity to attribute.',
      };
    }

    const range: Prisma.DateTimeFilter = {};
    if (params.from) range.gte = new Date(params.from);
    if (params.to) range.lte = new Date(params.to);
    const hasRange = params.from !== undefined || params.to !== undefined;

    const [
      leadsAssigned,
      leadsConverted,
      itinerariesCreated,
      bookingsCreated,
      bookingsAgg,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: {
          assignedToId: emp.userId,
          ...(hasRange ? { createdAt: range } : {}),
        },
      }),
      this.prisma.lead.count({
        where: {
          assignedToId: emp.userId,
          status: 'CONFIRMED',
          ...(hasRange ? { createdAt: range } : {}),
        },
      }),
      this.prisma.itinerary.count({
        where: {
          createdById: emp.userId,
          ...(hasRange ? { createdAt: range } : {}),
        },
      }),
      this.prisma.booking.count({
        where: {
          createdById: emp.userId,
          status: { not: 'CANCELLED' },
          ...(hasRange ? { createdAt: range } : {}),
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          createdById: emp.userId,
          status: { not: 'CANCELLED' },
          ...(hasRange ? { createdAt: range } : {}),
        },
        _sum: { totalSell: true, totalNet: true },
      }),
    ]);

    const revenue = bookingsAgg._sum.totalSell ?? 0;
    const estCost = bookingsAgg._sum.totalNet ?? 0;
    const grossProfit = revenue - estCost;

    return {
      linked: true,
      leadsAssigned,
      leadsConverted,
      conversionPercent:
        leadsAssigned > 0 ? (leadsConverted / leadsAssigned) * 100 : 0,
      itinerariesCreated,
      bookingsCreated,
      revenue,
      grossProfit,
      averageDealSize:
        bookingsCreated > 0 ? Math.round(revenue / bookingsCreated) : 0,
    };
  }
}
