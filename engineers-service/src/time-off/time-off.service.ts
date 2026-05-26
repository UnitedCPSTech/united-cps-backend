import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseAndNormalizeIsoDate } from '../common/utils/date-normalize';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import {
  TimeOffDateType,
  TimeOffRequest,
  TimeOffRequestDocument,
  TimeOffStatus,
} from './schemas/time-off-request.schema';
import { Engineer, EngineerDocument } from '../engineers/schemas/engineer.schema';

@Injectable()
export class TimeOffService {
  constructor(
    @InjectModel(TimeOffRequest.name, 'engineers')
    private readonly timeOffModel: Model<TimeOffRequestDocument>,

    @InjectModel(Engineer.name, 'engineers')
    private readonly engineerModel: Model<EngineerDocument>,
  ) {}

  private normalizeIso(iso: string): Date {
    try {
      return parseAndNormalizeIsoDate(iso);
    } catch {
      throw new BadRequestException('Invalid date');
    }
  }

  private buildDaysForRange(from: Date, to: Date): Date[] {
    if (to < from) throw new BadRequestException('dateTo must be >= dateFrom');

    const days: Date[] = [];
    const cursor = new Date(from.getTime());

    // inclusive range, by day
    while (cursor.getTime() <= to.getTime()) {
      days.push(new Date(cursor.getTime()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // safety cap for MVP
    if (days.length > 60) {
      throw new BadRequestException('RANGE time off cannot exceed 60 days');
    }

    return days;
  }

  private uniqueSortedDates(dates: Date[]): Date[] {
    const map = new Map<number, Date>();
    for (const d of dates) map.set(d.getTime(), d);
    return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime());
  }

  private async assertNoOverlap(engineerObjectId: Types.ObjectId, days: Date[]) {
    const overlapping = await this.timeOffModel.exists({
      engineerId: engineerObjectId,
      status: { $nin: [TimeOffStatus.CANCELLED, TimeOffStatus.REJECTED] },
      days: { $in: days },
    });

    if (overlapping) {
      throw new BadRequestException('Time off overlaps with an existing request for this engineer');
    }
  }

  async create(dto: CreateTimeOffDto, createdByUserId?: string) {
    const engineerObjectId = new Types.ObjectId(dto.engineerId);

    // (optional) sanity check engineer exists
    const engineerExists = await this.engineerModel.exists({ _id: engineerObjectId });
    if (!engineerExists) throw new NotFoundException('Engineer not found');

    const now = new Date();

    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;
    let specificDates: Date[] = [];
    let days: Date[] = [];

    if (dto.dateType === TimeOffDateType.RANGE) {
      if (!dto.dateFrom || !dto.dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required for RANGE');
      }

      dateFrom = this.normalizeIso(dto.dateFrom);
      dateTo = this.normalizeIso(dto.dateTo);

      days = this.buildDaysForRange(dateFrom, dateTo);
      specificDates = [];
    } else if (dto.dateType === TimeOffDateType.MULTI) {
      const input = dto.specificDates ?? [];
      if (input.length === 0) throw new BadRequestException('specificDates is required for MULTI');
      if (input.length > 20) throw new BadRequestException('specificDates cannot exceed 20 dates');

      const normalized = input.map((d) => this.normalizeIso(d));
      specificDates = this.uniqueSortedDates(normalized);
      days = specificDates;

      dateFrom = null;
      dateTo = null;
    } else {
      throw new BadRequestException('Unsupported dateType');
    }

    await this.assertNoOverlap(engineerObjectId, days);

    return this.timeOffModel.create({
      engineerId: engineerObjectId,
      country: dto.country,
      status: TimeOffStatus.PENDING,

      dateType: dto.dateType,
      dateFrom,
      dateTo,
      specificDates,
      days,

      reason: dto.reason,
      requestedAt: now,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      updatedAt: now,

      // optional, if you add it to schema
      // createdByUserId: createdByUserId ? new Types.ObjectId(createdByUserId) : null,
    });
  }

  async createForUser(userId: string, dto: Omit<CreateTimeOffDto, 'engineerId'>) {
    // map auth userId -> engineerId
    const engineer = await this.engineerModel.findOne({ userId }).lean();
    if (!engineer) throw new NotFoundException('Engineer profile not found for this user');

    return this.create({ ...(dto as any), engineerId: String(engineer._id) }, userId);
  }
    private toDate(value: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  async listByEngineer(engineerId: string, from?: string, to?: string) {
    const id = new Types.ObjectId(engineerId);

    const filter: any = { engineerId: id };

    // Optional window filter
    if (from || to) {
      const and: any[] = [];
      if (from) and.push({ days: { $gte: this.normalizeIso(from) } });
      if (to) and.push({ days: { $lte: this.normalizeIso(to) } });
      if (and.length) filter.$and = and;
    }

    return this.timeOffModel
      .find(filter)
      .sort({ requestedAt: -1 })
      .lean();
  }

  async getById(id: string) {
    const doc = await this.timeOffModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Time off request not found');
    return doc;
  }

  async updateStatus(
    id: string,
    dto: { status: TimeOffStatus; reviewNote?: string },
    reviewedByUserId: string,
  ) {
    // Only managers hit this endpoint, controller already guards it.
    const now = new Date();

    const updated = await this.timeOffModel.findByIdAndUpdate(
      id,
      {
        status: dto.status,
        reviewNote: dto.reviewNote ?? null,
        reviewedByUserId: new Types.ObjectId(reviewedByUserId),
        reviewedAt: now,
        updatedAt: now,
      },
      { returnDocument: 'after' as any },
    );

    if (!updated) throw new NotFoundException('Time off request not found');
    return updated;
  }

  async cancel(id: string, userId: string) {
    // Engineer cancel. We should ensure the request belongs to the engineer user.
    const engineer = await this.engineerModel.findOne({ userId }).lean();
    if (!engineer) throw new NotFoundException('Engineer profile not found for this user');

    const doc = await this.timeOffModel.findById(id);
    if (!doc) throw new NotFoundException('Time off request not found');

    if (String(doc.engineerId) !== String(engineer._id)) {
      throw new BadRequestException('You can only cancel your own time off request');
    }

    doc.status = TimeOffStatus.CANCELLED;
    doc.updatedAt = new Date();
    await doc.save();
    return doc;
  }
}