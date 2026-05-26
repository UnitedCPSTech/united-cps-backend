import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  Assignment,
  AssignmentDocument,
  AssignmentStatus,
} from './schemas/assignments.schema';
import {
  JobDates,
  JobDatesDocument,
  JobDateType,
} from '../job-dates/schemas/job-dates.schema';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,

    @InjectModel(JobDates.name)
    private readonly jobDatesModel: Model<JobDatesDocument>,
  ) {}

  async create(dto: CreateAssignmentDto, assignedByUserId: string) {
    if (!Types.ObjectId.isValid(assignedByUserId)) {
      throw new BadRequestException('Invalid assignedByUserId');
    }

    try {
      const doc = await this.assignmentModel.create({
        jobId: new Types.ObjectId(dto.jobId),
        engineerId: new Types.ObjectId(dto.engineerId),
        engineerUserId: new Types.ObjectId(dto.engineerUserId),
        engineerNameSnapshot: dto.engineerNameSnapshot,
        country: dto.country,
        assignedByUserId: new Types.ObjectId(assignedByUserId),
        assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
        acceptanceDeadlineAt: dto.acceptanceDeadlineAt
          ? new Date(dto.acceptanceDeadlineAt)
          : null,
        acceptedAt: null,
        declinedAt: null,
        declineReason: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
      });

      return doc;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException(
          'This engineer is already assigned to this job',
        );
      }
      throw error;
    }
  }

  async setStatus(
    id: string,
    status: AssignmentStatus,
    actorUserId: string,
    note?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid assignment id');
    }

    if (!Types.ObjectId.isValid(actorUserId)) {
      throw new BadRequestException('Invalid actor user id');
    }

    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const now = new Date();

    if (status === AssignmentStatus.ACCEPTED) {
      if (assignment.assignmentStatus === AssignmentStatus.CANCELLED) {
        throw new BadRequestException('Cancelled assignment cannot be accepted');
      }

      assignment.assignmentStatus = AssignmentStatus.ACCEPTED;
      assignment.acceptedAt = now;
      assignment.declinedAt = null;
      assignment.declineReason = null;
    }

    if (status === AssignmentStatus.DECLINED) {
      if (!note) {
        throw new BadRequestException('Decline reason is required');
      }

      if (assignment.assignmentStatus === AssignmentStatus.CANCELLED) {
        throw new BadRequestException('Cancelled assignment cannot be declined');
      }

      assignment.assignmentStatus = AssignmentStatus.DECLINED;
      assignment.declinedAt = now;
      assignment.declineReason = note;
      assignment.acceptedAt = null;
    }

    if (status === AssignmentStatus.CANCELLED) {
      if (!note) {
        throw new BadRequestException('Cancel reason is required');
      }

      assignment.assignmentStatus = AssignmentStatus.CANCELLED;
      assignment.cancelledAt = now;
      assignment.cancelReason = note;
      assignment.cancelledByUserId = new Types.ObjectId(actorUserId);
    }

    await assignment.save();
    return assignment;
  }

  async engineerRespond(
    assignmentId: string,
    authUserId: string,
    status: AssignmentStatus.ACCEPTED | AssignmentStatus.DECLINED,
    note?: string,
  ) {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestException('Invalid assignment id');
    }

    if (!Types.ObjectId.isValid(authUserId)) {
      throw new BadRequestException('Invalid auth user id');
    }

    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (String(assignment.engineerUserId) !== String(authUserId)) {
      throw new ForbiddenException(
        'You can only respond to assignments created for you',
      );
    }

    if (assignment.assignmentStatus === AssignmentStatus.CANCELLED) {
      throw new BadRequestException('Cancelled assignment cannot be changed');
    }

    return this.setStatus(assignmentId, status, authUserId, note);
  }

  async getByJob(jobId: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid job id');
    }

    return this.assignmentModel
      .find({ jobId: new Types.ObjectId(jobId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getByEngineer(engineerId: string) {
    if (!Types.ObjectId.isValid(engineerId)) {
      throw new BadRequestException('Invalid engineer id');
    }

    return this.assignmentModel
      .find({ engineerId: new Types.ObjectId(engineerId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  private normalizeToUtcMidnight(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private parseIsoToUtcMidnight(iso: string): Date {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return this.normalizeToUtcMidnight(d);
  }

  private buildDaysForRange(from: Date, to: Date): Date[] {
    if (to < from) {
      throw new BadRequestException('to must be >= from');
    }

    const days: Date[] = [];
    const cursor = new Date(from.getTime());

    while (cursor.getTime() <= to.getTime()) {
      days.push(new Date(cursor.getTime()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (days.length > 60) {
      throw new BadRequestException('Window cannot exceed 60 days');
    }

    return days;
  }

  private intersectDays(a: Date[], bSet: Set<number>): Date[] {
    return a.filter((d) => bSet.has(d.getTime()));
  }

  async getConflicts(engineerId: string, fromIso: string, toIso: string) {
    if (!Types.ObjectId.isValid(engineerId)) {
      throw new BadRequestException('Invalid engineer id');
    }

    const engineerObjectId = new Types.ObjectId(engineerId);
    const from = this.parseIsoToUtcMidnight(fromIso);
    const to = this.parseIsoToUtcMidnight(toIso);

    const windowDays = this.buildDaysForRange(from, to);

    const active = await this.assignmentModel
      .find({
        engineerId: engineerObjectId,
        assignmentStatus: {
          $in: [
            AssignmentStatus.PENDING_ACCEPTANCE,
            AssignmentStatus.ACCEPTED,
          ],
        },
      })
      .select({ jobId: 1, _id: 1, assignmentStatus: 1 })
      .lean();

    if (active.length === 0) {
      return {
        engineerId,
        from: from.toISOString(),
        to: to.toISOString(),
        hasConflicts: false,
        conflictDates: [],
        conflicts: [],
      };
    }

    const jobIds = active.map((a) => a.jobId).filter((id) => id !== undefined);

    const jobDatesDocs = await this.jobDatesModel
      .find({ jobId: { $in: jobIds } })
      .select({ jobId: 1, dateType: 1, dateFrom: 1, dateTo: 1, specificDates: 1 })
      .lean();

    const datesByJobId = new Map<string, any>();
    for (const jd of jobDatesDocs as any[]) {
      datesByJobId.set(String(jd.jobId), jd);
    }

    const conflicts: Array<{
      jobId: string;
      assignmentId: string;
      dates: string[];
    }> = [];

    const allConflictTimes = new Set<number>();

    for (const a of active) {
      const jd = datesByJobId.get(String(a.jobId));
      if (!jd) continue;

      let jobDays: Date[] = [];

      if (jd.dateType === JobDateType.RANGE) {
        if (jd.dateFrom && jd.dateTo) {
          jobDays = this.buildDaysForRange(
            this.normalizeToUtcMidnight(new Date(jd.dateFrom)),
            this.normalizeToUtcMidnight(new Date(jd.dateTo)),
          );
        }
      } else if (jd.dateType === JobDateType.MULTI) {
        jobDays = (jd.specificDates ?? []).map((x: any) =>
          this.normalizeToUtcMidnight(new Date(x)),
        );
      }

      const jobSet = new Set(jobDays.map((d) => d.getTime()));
      const overlap = this.intersectDays(windowDays, jobSet);

      if (overlap.length === 0) continue;

      overlap.forEach((d) => allConflictTimes.add(d.getTime()));

      conflicts.push({
        jobId: String(a.jobId),
        assignmentId: String(a._id),
        dates: overlap.map((d) => d.toISOString()),
      });
    }

    const conflictDates = Array.from(allConflictTimes)
      .sort((x, y) => x - y)
      .map((t) => new Date(t).toISOString());

    return {
      engineerId,
      from: from.toISOString(),
      to: to.toISOString(),
      hasConflicts: conflictDates.length > 0,
      conflictDates,
      conflicts,
    };
  }

  async list(params: {
  jobId?: string;
  engineerId?: string;
  status?: AssignmentStatus;
}) {
  const filter: Record<string, any> = {};

  if (params.jobId) {
    if (!Types.ObjectId.isValid(params.jobId)) {
      throw new BadRequestException('Invalid job id');
    }
    filter.jobId = new Types.ObjectId(params.jobId);
  }

  if (params.engineerId) {
    if (!Types.ObjectId.isValid(params.engineerId)) {
      throw new BadRequestException('Invalid engineer id');
    }
    filter.engineerId = new Types.ObjectId(params.engineerId);
  }

  if (params.status) {
    filter.assignmentStatus = params.status;
  }

  return this.assignmentModel.find(filter).sort({ createdAt: -1 }).lean();
}
}