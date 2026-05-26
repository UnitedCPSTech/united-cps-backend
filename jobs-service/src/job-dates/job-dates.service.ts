import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobsService } from '../jobs/jobs.service';
import { parseAndNormalizeIsoDate } from '../common/utils/date-normalize';
import { UpsertJobDatesDto } from './dto/upsert-job-dates.dto';
import { JobDates, JobDatesDocument, JobDateType } from './schemas/job-dates.schema';

@Injectable()
export class JobDatesService {
  constructor(
    @InjectModel(JobDates.name) private readonly jobDatesModel: Model<JobDatesDocument>,
    private readonly jobsService: JobsService,
  ) {}

  private normalizeIso(iso: string): Date {
    try {
      return parseAndNormalizeIsoDate(iso);
    } catch {
      throw new BadRequestException('Invalid date');
    }
  }

  private validateRange(from: Date, to: Date) {
    if (to < from) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
  }

  private uniqueSortedDates(dates: Date[]): Date[] {
    const map = new Map<number, Date>();
    for (const d of dates) {
      map.set(d.getTime(), d);
    }
    return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime());
  }

  async upsert(jobId: string, dto: UpsertJobDatesDto) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid job id');
    }

    const jobObjectId = new Types.ObjectId(jobId);

    const job = await this.jobsService.get(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (dto.dateType === JobDateType.RANGE) {
      if (!dto.dateFrom || !dto.dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required for RANGE');
      }

      const from = this.normalizeIso(dto.dateFrom);
      const to = this.normalizeIso(dto.dateTo);
      this.validateRange(from, to);

      return this.jobDatesModel.findOneAndUpdate(
        { jobId: jobObjectId },
        {
          jobId: jobObjectId,
          country: dto.country,
          dateType: JobDateType.RANGE,
          dateFrom: from,
          dateTo: to,
          specificDates: [],
        },
        { upsert: true, returnDocument: 'after' },
      );
    }

    if (dto.dateType === JobDateType.MULTI) {
      const input = dto.specificDates ?? [];

      if (input.length === 0) {
        throw new BadRequestException('specificDates is required for MULTI');
      }

      if (input.length > 20) {
        throw new BadRequestException('specificDates cannot exceed 20 dates');
      }

      const normalized = input.map((iso) => this.normalizeIso(iso));
      const uniqueSorted = this.uniqueSortedDates(normalized);

      return this.jobDatesModel.findOneAndUpdate(
        { jobId: jobObjectId },
        {
          jobId: jobObjectId,
          country: dto.country,
          dateType: JobDateType.MULTI,
          dateFrom: null,
          dateTo: null,
          specificDates: uniqueSorted,
        },
        { upsert: true, returnDocument: 'after' },
      );
    }

    throw new BadRequestException('Unsupported dateType');
  }

  async getByJobId(jobId: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid job id');
    }

    return this.jobDatesModel.findOne({ jobId: new Types.ObjectId(jobId) }).lean();
  }
}